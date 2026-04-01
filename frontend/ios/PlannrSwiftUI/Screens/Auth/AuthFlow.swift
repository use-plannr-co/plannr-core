import SwiftUI

// MARK: - AuthFlow
// Mirrors AuthStack (SignIn + SignUp screens).
// Uses NavigationStack so SignUp can push onto SignIn.

struct AuthFlow: View {
    var body: some View {
        NavigationStack {
            SignInView()
        }
    }
}

// MARK: - SignInView

struct SignInView: View {
    @EnvironmentObject var appState: AppState
    @State private var email = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var errorMessage: String? = nil

    var body: some View {
        ScrollView {
            VStack(spacing: PlSpacing.s8) {

                // Logo / wordmark
                VStack(spacing: PlSpacing.s2) {
                    LinearGradient.plPurple
                        .mask(
                            Text("Plannr")
                                .font(PlFont.title(.black))
                        )
                        .frame(height: 44)

                    Text("Your AI scheduling assistant")
                        .font(PlFont.body())
                        .foregroundStyle(.secondary)
                }
                .padding(.top, 60)

                // Fields
                VStack(spacing: PlSpacing.s3) {
                    PlTextField(placeholder: "Email", text: $email, keyboardType: .emailAddress)
                    PlTextField(placeholder: "Password", text: $password, isSecure: true)
                }

                // Error
                if let err = errorMessage {
                    Text(err)
                        .font(PlFont.caption())
                        .foregroundStyle(.red)
                }

                // Sign in button
                PlButton(title: isLoading ? "Signing in…" : "Sign In") {
                    signIn()
                }
                .disabled(isLoading || email.isEmpty || password.isEmpty)

                // Sign up link
                NavigationLink {
                    SignUpView()
                } label: {
                    HStack(spacing: 4) {
                        Text("Don't have an account?")
                            .foregroundStyle(.secondary)
                        Text("Sign up")
                            .foregroundStyle(.plGradientStart)
                    }
                    .font(PlFont.body())
                }
            }
            .padding(.horizontal, PlSpacing.s4)
        }
        .navigationBarHidden(true)
    }

    private func signIn() {
        isLoading = true
        errorMessage = nil
        // Simulate Clerk auth
        Task {
            try? await Task.sleep(nanoseconds: 1_000_000_000)
            await MainActor.run {
                isLoading = false
                if email.lowercased().contains("@") {
                    appState.isAuthenticated = true
                } else {
                    errorMessage = "Invalid email or password."
                }
            }
        }
    }
}

// MARK: - SignUpView

struct SignUpView: View {
    @EnvironmentObject var appState: AppState
    @Environment(\.dismiss) private var dismiss

    @State private var name = ""
    @State private var email = ""
    @State private var password = ""
    @State private var isLoading = false

    var body: some View {
        ScrollView {
            VStack(spacing: PlSpacing.s8) {
                VStack(alignment: .leading, spacing: PlSpacing.s2) {
                    Text("Create account")
                        .font(PlFont.title())
                    Text("Start scheduling smarter.")
                        .font(PlFont.body())
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.top, PlSpacing.s8)

                VStack(spacing: PlSpacing.s3) {
                    PlTextField(placeholder: "Display name", text: $name)
                    PlTextField(placeholder: "Email", text: $email, keyboardType: .emailAddress)
                    PlTextField(placeholder: "Password", text: $password, isSecure: true)
                }

                PlButton(title: isLoading ? "Creating account…" : "Create Account") {
                    signUp()
                }
                .disabled(isLoading || name.isEmpty || email.isEmpty || password.isEmpty)
            }
            .padding(.horizontal, PlSpacing.s4)
        }
        .navigationTitle("Sign Up")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func signUp() {
        isLoading = true
        Task {
            try? await Task.sleep(nanoseconds: 1_000_000_000)
            await MainActor.run {
                isLoading = false
                appState.userProfile.displayName = name
                appState.isAuthenticated = true
            }
        }
    }
}

// MARK: - Shared form components

struct PlTextField: View {
    let placeholder: String
    @Binding var text: String
    var keyboardType: UIKeyboardType = .default
    var isSecure: Bool = false

    var body: some View {
        Group {
            if isSecure {
                SecureField(placeholder, text: $text)
            } else {
                TextField(placeholder, text: $text)
                    .keyboardType(keyboardType)
                    .autocapitalization(.none)
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .font(PlFont.body())
    }
}

struct PlButton: View {
    let title: String
    var style: Style = .primary
    let action: () -> Void

    enum Style { case primary, destructive, secondary }

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(PlFont.subHeading(.semibold))
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding()
                .background(background)
                .clipShape(RoundedRectangle(cornerRadius: 14))
        }
    }

    @ViewBuilder var background: some View {
        switch style {
        case .primary:     LinearGradient.plPurple
        case .destructive: Color.plRed
        case .secondary:   Color(.tertiarySystemBackground)
        }
    }
}
