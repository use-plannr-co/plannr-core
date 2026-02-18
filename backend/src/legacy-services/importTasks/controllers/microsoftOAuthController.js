import crypto from 'crypto';
import axios from 'axios';
import { db } from '../../../config/db.js';
import EncryptionService from '../services/encryptionService.js';
import GraphClient from '../providers/microsoft/graphClient.js';
import { providerConnections, importSessions } from '../../../db/schema.js';
import { eq, and } from 'drizzle-orm';

const MICROSOFT_AUTHORITY = 'https://login.microsoftonline.com/common';
const MICROSOFT_TOKEN_ENDPOINT = `${MICROSOFT_AUTHORITY}/oauth2/v2.0/token`;
const MICROSOFT_AUTHORIZE_ENDPOINT = `${MICROSOFT_AUTHORITY}/oauth2/v2.0/authorize`;

// Required scopes for Microsoft Graph
const REQUIRED_SCOPES = [
    'https://graph.microsoft.com/Tasks.Read',
    'https://graph.microsoft.com/Calendars.Read',
    'offline_access', // For refresh tokens
];

class MicrosoftOAuthController {
    constructor() {
        this.encryptionService = new EncryptionService();
        this.clientId = process.env.MICROSOFT_CLIENT_ID;
        this.clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
        this.redirectUri = process.env.MICROSOFT_REDIRECT_URI;

        if (!this.clientId || !this.redirectUri) {
            throw new Error('Missing required Microsoft OAuth configuration');
        }
    }

    /**
     * Generate PKCE challenge for secure OAuth flow
     */
    generatePKCE() {
        const codeVerifier = crypto.randomBytes(32).toString('base64url');
        const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

        return { codeVerifier, codeChallenge };
    }

    /**
     * Initiate OAuth flow - returns authorization URL
     */
    async initiateAuth(req, res) {
        try {
            const { userId } = req.user; // From auth middleware
            const { returnUrl } = req.body;

            // Generate PKCE parameters and state
            const { codeVerifier, codeChallenge } = this.generatePKCE();
            const state = crypto.randomUUID();

            // Store PKCE verifier and state temporarily (5 minutes expiry)
            const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
            await db.insert(importSessions).values({
                userId,
                provider: 'microsoft',
                sessionType: 'oauth_pending',
                state,
                metadata: JSON.stringify({
                    codeVerifier,
                    returnUrl: returnUrl || null,
                }),
                expiresAt,
            });

            // Build authorization URL
            const authParams = new URLSearchParams({
                client_id: this.clientId,
                response_type: 'code',
                redirect_uri: this.redirectUri,
                scope: REQUIRED_SCOPES.join(' '),
                state,
                code_challenge: codeChallenge,
                code_challenge_method: 'S256',
                prompt: 'consent', // Force consent to ensure we get all required permissions
            });

            const authUrl = `${MICROSOFT_AUTHORIZE_ENDPOINT}?${authParams.toString()}`;

            res.json({
                success: true,
                authUrl,
                state,
            });
        } catch (error) {
            console.error('Microsoft OAuth initiation error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to initiate Microsoft authentication',
            });
        }
    }

    /**
     * Handle OAuth callback and exchange code for tokens
     */
    async handleCallback(req, res) {
        try {
            const { code, state, error, error_description } = req.query;

            // Handle OAuth errors
            if (error) {
                console.error('Microsoft OAuth error:', error, error_description);
                return res.status(400).json({
                    success: false,
                    error: error_description || 'OAuth authentication failed',
                });
            }

            if (!code || !state) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing authorization code or state parameter',
                });
            }

            // Retrieve and validate session
            const [session] = await db
                .select()
                .from(importSessions)
                .where(
                    and(
                        eq(importSessions.state, state),
                        eq(importSessions.provider, 'microsoft'),
                        eq(importSessions.sessionType, 'oauth_pending')
                    )
                )
                .limit(1);

            if (!session) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid or expired OAuth state',
                });
            }

            // Check if session is expired
            if (new Date() > session.expiresAt) {
                await db.delete(importSessions).where(eq(importSessions.id, session.id));
                return res.status(400).json({
                    success: false,
                    error: 'OAuth session expired',
                });
            }

            const metadata = JSON.parse(session.metadata);
            const { codeVerifier, returnUrl } = metadata;

            // Exchange authorization code for tokens
            const tokenResponse = await this.exchangeCodeForTokens(code, codeVerifier);

            // Get user profile from Microsoft Graph
            const graphClient = new GraphClient(tokenResponse.access_token);
            const profile = await graphClient.getUserProfile();

            // Test permissions
            const connectionTest = await graphClient.testConnection();
            if (!connectionTest.success) {
                throw new Error(`Permission test failed: ${connectionTest.error}`);
            }

            // Store encrypted connection
            const encryptedAccessToken = this.encryptionService.encrypt(tokenResponse.access_token);
            const encryptedRefreshToken = tokenResponse.refresh_token
                ? this.encryptionService.encrypt(tokenResponse.refresh_token)
                : null;

            // Calculate token expiry
            const expiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000);

            // Check if connection already exists
            const [existingConnection] = await db
                .select()
                .from(providerConnections)
                .where(
                    and(
                        eq(providerConnections.userId, session.userId),
                        eq(providerConnections.provider, 'microsoft')
                    )
                )
                .limit(1);

            if (existingConnection) {
                // Update existing connection
                await db
                    .update(providerConnections)
                    .set({
                        providerUserId: profile.id,
                        displayName: profile.displayName,
                        email: profile.mail || profile.userPrincipalName,
                        encryptedAccessToken,
                        encryptedRefreshToken,
                        tokenExpiresAt: expiresAt,
                        lastSyncAt: null, // Reset sync status
                        metadata: JSON.stringify({
                            permissions: connectionTest.permissions,
                            lastPermissionCheck: new Date().toISOString(),
                        }),
                        updatedAt: new Date(),
                    })
                    .where(eq(providerConnections.id, existingConnection.id));
            } else {
                // Create new connection
                await db.insert(providerConnections).values({
                    userId: session.userId,
                    provider: 'microsoft',
                    providerUserId: profile.id,
                    displayName: profile.displayName,
                    email: profile.mail || profile.userPrincipalName,
                    encryptedAccessToken,
                    encryptedRefreshToken,
                    tokenExpiresAt: expiresAt,
                    metadata: JSON.stringify({
                        permissions: connectionTest.permissions,
                        lastPermissionCheck: new Date().toISOString(),
                    }),
                });
            }

            // Clean up OAuth session
            await db.delete(importSessions).where(eq(importSessions.id, session.id));

            // Redirect or return success
            if (returnUrl) {
                res.redirect(`${returnUrl}?success=true&provider=microsoft`);
            } else {
                res.json({
                    success: true,
                    message: 'Microsoft account connected successfully',
                    profile: {
                        displayName: profile.displayName,
                        email: profile.mail || profile.userPrincipalName,
                    },
                });
            }
        } catch (error) {
            console.error('Microsoft OAuth callback error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to complete Microsoft authentication',
            });
        }
    }

    /**
     * Exchange authorization code for access and refresh tokens
     */
    async exchangeCodeForTokens(code, codeVerifier) {
        const tokenParams = new URLSearchParams({
            client_id: this.clientId,
            grant_type: 'authorization_code',
            code,
            redirect_uri: this.redirectUri,
            code_verifier: codeVerifier,
        });

        // Add client secret if available (for confidential clients)
        if (this.clientSecret) {
            tokenParams.append('client_secret', this.clientSecret);
        }

        try {
            const response = await axios.post(MICROSOFT_TOKEN_ENDPOINT, tokenParams, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Accept: 'application/json',
                },
            });

            return response.data;
        } catch (error) {
            const errorMessage = error.response?.data?.error_description || 'Token exchange failed';
            throw new Error(`Microsoft token exchange error: ${errorMessage}`);
        }
    }

    /**
     * Refresh access token using refresh token
     */
    async refreshAccessToken(refreshToken) {
        const tokenParams = new URLSearchParams({
            client_id: this.clientId,
            grant_type: 'refresh_token',
            refresh_token: refreshToken,
            scope: REQUIRED_SCOPES.join(' '),
        });

        if (this.clientSecret) {
            tokenParams.append('client_secret', this.clientSecret);
        }

        try {
            const response = await axios.post(MICROSOFT_TOKEN_ENDPOINT, tokenParams, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Accept: 'application/json',
                },
            });

            return response.data;
        } catch (error) {
            const errorMessage = error.response?.data?.error_description || 'Token refresh failed';
            throw new Error(`Microsoft token refresh error: ${errorMessage}`);
        }
    }

    /**
     * Get valid access token for a user (refresh if needed)
     */
    async getValidAccessToken(userId) {
        const [connection] = await db
            .select()
            .from(providerConnections)
            .where(
                and(
                    eq(providerConnections.userId, userId),
                    eq(providerConnections.provider, 'microsoft')
                )
            )
            .limit(1);

        if (!connection) {
            throw new Error('No Microsoft connection found for user');
        }

        const now = new Date();
        const tokenExpiry = new Date(connection.tokenExpiresAt);

        // If token is still valid (with 5 minute buffer), return it
        if (now < new Date(tokenExpiry.getTime() - 5 * 60 * 1000)) {
            return this.encryptionService.decrypt(connection.encryptedAccessToken);
        }

        // Token is expired, try to refresh
        if (!connection.encryptedRefreshToken) {
            throw new Error('Microsoft connection expired and no refresh token available');
        }

        const refreshToken = this.encryptionService.decrypt(connection.encryptedRefreshToken);
        const tokenResponse = await this.refreshAccessToken(refreshToken);

        // Update stored tokens
        const newExpiresAt = new Date(Date.now() + tokenResponse.expires_in * 1000);
        const encryptedAccessToken = this.encryptionService.encrypt(tokenResponse.access_token);
        const encryptedRefreshToken = tokenResponse.refresh_token
            ? this.encryptionService.encrypt(tokenResponse.refresh_token)
            : connection.encryptedRefreshToken;

        await db
            .update(providerConnections)
            .set({
                encryptedAccessToken,
                encryptedRefreshToken,
                tokenExpiresAt: newExpiresAt,
                updatedAt: new Date(),
            })
            .where(eq(providerConnections.id, connection.id));

        return tokenResponse.access_token;
    }

    /**
     * Disconnect Microsoft account
     */
    async disconnect(req, res) {
        try {
            const { userId } = req.user;

            const result = await db
                .delete(providerConnections)
                .where(
                    and(
                        eq(providerConnections.userId, userId),
                        eq(providerConnections.provider, 'microsoft')
                    )
                );

            res.json({
                success: true,
                message: 'Microsoft account disconnected successfully',
            });
        } catch (error) {
            console.error('Microsoft disconnect error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to disconnect Microsoft account',
            });
        }
    }
}

export default MicrosoftOAuthController;
