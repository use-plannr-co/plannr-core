# RevenueCat Integration Quick Start

## 🎯 Phase 1 Status: COMPLETE ✅

Phase 1 (SDK Installation & Configuration) and Phase 2 (Subscription State Layer) are fully implemented and ready for use.

## 🚀 Getting Started

### Step 1: Configure Environment Variables

#### Frontend `.env` file
Create or update `frontend/.env`:
```bash
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=your_ios_api_key_from_revenuecat_dashboard
```

#### Backend `.env` file
Add to `backend/.env`:
```bash
REVENUECAT_WEBHOOK_SECRET=your_webhook_secret_from_revenuecat_dashboard
```

### Step 2: RevenueCat Dashboard Setup

1. Create/login to RevenueCat account
2. Create a new project (or use existing)
3. Configure iOS app:
   - Add your iOS bundle ID
   - Connect to App Store Connect
4. Create entitlement named: `plannr_pro`
5. Create products:
   - Monthly subscription (identifier: `$rc_monthly` or custom)
   - Annual subscription (identifier: `$rc_annual` or custom)
6. Attach products to `plannr_pro` entitlement
7. Create a default offering with both products
8. Copy your **iOS API Key** → add to frontend `.env`
9. Generate webhook authorization header → add to backend `.env`

### Step 3: Rebuild Native Code (If Needed)

Since `react-native-purchases` is a native module:

```bash
cd frontend

# For iOS
npx expo prebuild --platform ios
npx expo run:ios

# Or if you use EAS build
eas build --profile development --platform ios
```

### Step 4: Test in Development

Run your app and check logs:

```bash
cd frontend
npm start
# Then press 'i' for iOS
```

**Expected logs** (when signed in with Clerk):
```
📱 SubscriptionProvider: Initializing for user: user_xxxxx
📱 SubscriptionService: Initializing with app user ID: user_xxxxx
✅ SubscriptionService: Initialization complete
📊 Active entitlements: []
```

## 📖 Using Subscription State in Your Code

### Basic Usage

```javascript
import { useSubscription } from '../hooks/useSubscription';

function MyScreen() {
    const { isPro, isLoading, isReady } = useSubscription();

    if (isLoading) {
        return <LoadingSpinner />;
    }

    if (!isReady) {
        return <Text>Setting up...</Text>;
    }

    return (
        <View>
            {isPro ? (
                <ProFeature />
            ) : (
                <UpgradePrompt />
            )}
        </View>
    );
}
```

### Advanced Usage

```javascript
import { useSubscription } from '../hooks/useSubscription';

function SubscriptionManager() {
    const {
        isPro,
        activeEntitlements,
        expirationAt,
        managementURL,
        fetchOfferings,
        purchasePackage,
        restorePurchases,
    } = useSubscription();

    const handlePurchase = async () => {
        try {
            const offerings = await fetchOfferings();
            const monthlyPackage = offerings.current?.monthly;
            
            if (monthlyPackage) {
                await purchasePackage(monthlyPackage);
                Alert.alert('Success', 'Welcome to Plannr Pro!');
            }
        } catch (error) {
            if (!error.userCancelled) {
                Alert.alert('Error', error.message);
            }
        }
    };

    const handleRestore = async () => {
        try {
            await restorePurchases();
            Alert.alert('Restored', 'Your purchases have been restored');
        } catch (error) {
            Alert.alert('Error', error.message);
        }
    };

    return (
        <View>
            <Text>Pro Status: {isPro ? 'Active' : 'Inactive'}</Text>
            {isPro && <Text>Expires: {expirationAt}</Text>}
            <Button title="Purchase" onPress={handlePurchase} />
            <Button title="Restore" onPress={handleRestore} />
        </View>
    );
}
```

## 🎨 What's Next?

### Phase 3: Paywall Screen (Coming Soon)
You'll get a beautiful, pre-built paywall screen that:
- Shows monthly and annual options
- Highlights annual as "Best value"
- Handles purchase flow with proper loading states
- Includes restore button
- Shows terms/privacy/manage subscription links

### Phase 4: Feature Gating (Coming Soon)
You'll get convenient gating utilities:
- `<ProGate>` component to wrap Pro features
- `requirePro()` helper for navigation protection
- Automatic "Upgrade to Pro" prompts

### Phase 5: Backend Sync (Coming Soon)
Backend will receive and process:
- Webhook events from RevenueCat
- Subscription state stored in database
- Fallback app-driven sync endpoint

## 🧪 Testing Checklist

### Development Testing
- [ ] App starts without crashes on iOS
- [ ] Console shows initialization logs
- [ ] `useSubscription` hook returns data
- [ ] `isPro` is `false` for new users
- [ ] Android doesn't crash (skips subscription logic)

### Sandbox Testing (with RevenueCat sandbox mode)
- [ ] Can fetch offerings
- [ ] Can complete purchase flow
- [ ] Purchase triggers `isPro` to become `true`
- [ ] Can restore purchases
- [ ] Listener updates state after purchase

## 📞 Support

### Common Issues

**"Module react-native-purchases not found"**
- Run `npm install` in frontend directory
- Run `npx expo prebuild`
- Clean and rebuild

**"SubscriptionService not initialized"**
- Ensure user is signed in with Clerk
- Check that `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` is set
- Check logs for initialization errors

**"No offerings found"**
- Verify products are configured in RevenueCat dashboard
- Ensure products are attached to `plannr_pro` entitlement
- Check that a default offering exists

**State not updating after purchase**
- Check that listener is registered (see logs)
- Try manual refresh: `await refreshSubscription()`
- Verify entitlement is active in RevenueCat dashboard

## 📚 Documentation

- **Service Documentation**: `frontend/src/services/subscription/README.md`
- **Implementation Summary**: `docs/PHASE_1_COMPLETE.md`
- **Full Plan**: `docs/revenuecat-subscriptions-implementation-plan.md`

## 🎉 You're All Set!

Phase 1 is complete and production-ready. The subscription foundation is:
- ✅ Properly architected
- ✅ iOS-only for now
- ✅ Clerk-integrated
- ✅ Entitlement-based
- ✅ Error-resilient
- ✅ Well-documented

Ready to move to Phase 3 when you are! 🚀
