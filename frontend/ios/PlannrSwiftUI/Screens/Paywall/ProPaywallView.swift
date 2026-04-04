import SwiftUI

// MARK: - ProPaywallView
// Precisely matches ProPaywallScreen.jsx visual layout:
// - Gradient badge at top, PinkSunset title, features list
// - Plan cards: border 2.5pt (selected=gradientEnd), floating label top-right
// - Upgrade button: gradient, radius 12, minHeight 56
// - Sticky bottom section with fade gradient overlay

struct ProPaywallView: View {
    @EnvironmentObject var appState: AppState
    @Environment(\.dismiss) private var dismiss

    @State private var selectedPlan: Plan = .annual
    @State private var isPurchasing = false

    enum Plan: String, CaseIterable {
        case monthly = "Monthly"
        case annual  = "Annual"

        var price: String { self == .monthly ? "$6.99" : "$55.99" }
        var subLabel: String { self == .monthly ? "/month" : "/year" }
        var monthlyEquiv: String { self == .monthly ? "$6.99" : "$4.67" }
        var floatingLabel: String? { self == .annual ? "Best Value" : nil }
    }

    private let features: [(icon: String, text: String)] = [
        ("infinity",          "Unlimited Schedules"),
        ("sparkles",          "Unlimited AI Chat"),
        ("person.2.fill",     "Co-planning"),
        ("chart.bar.fill",    "Productivity Analytics"),
    ]

    var body: some View {
        NavigationStack {
            ZStack(alignment: .bottom) {
                ScrollView(showsIndicators: false) {
                    VStack(alignment: .center, spacing: 0) {

                        // Gradient badge
                        GradientBadge(label: "Plannr Pro")
                            .padding(.top, PlSpacing.s16)
                            .padding(.bottom, PlSpacing.s3)

                        // PinkSunset title
                        Text("Unlock everything.")
                            .font(PlFont.title())
                            .foregroundStyle(Color.plForeground)
                            .multilineTextAlignment(.center)
                            .padding(.bottom, PlSpacing.s2)

                        Text("The smartest way to own your time.")
                            .font(PlFont.subHeading())
                            .foregroundStyle(Color.plForeground.opacity(0.5))
                            .multilineTextAlignment(.center)
                            .padding(.bottom, PlSpacing.s6)

                        // Features list
                        VStack(alignment: .leading, spacing: PlSpacing.s4) {
                            ForEach(features, id: \.text) { f in
                                HStack(spacing: PlSpacing.s4) {
                                    Image(systemName: f.icon)
                                        .font(.system(size: 24))
                                        .foregroundStyle(Color.plForeground)
                                        .frame(width: 24)
                                    Text(f.text)
                                        .font(PlFont.subHeading())
                                        .foregroundStyle(Color.plForeground)
                                    Spacer()
                                }
                            }
                        }
                        .padding(.horizontal, PlSpacing.s4)
                        .padding(.bottom, PlSpacing.s6)

                        // Plan cards
                        VStack(spacing: PlSpacing.s2) {
                            ForEach(Plan.allCases, id: \.rawValue) { plan in
                                PaywallPlanCard(
                                    plan: plan,
                                    isSelected: selectedPlan == plan
                                ) { selectedPlan = plan }
                            }
                        }
                        .padding(.horizontal, PlSpacing.s4)
                        .padding(.top, PlSpacing.s4)

                        // Pricing detail
                        Text("Just \(selectedPlan.monthlyEquiv) / month")
                            .font(PlFont.subHeading())
                            .foregroundStyle(Color.plForeground.opacity(0.4))
                            .padding(.top, PlSpacing.s2)
                            .padding(.bottom, PlSpacing.s3)

                        // Spacer for sticky bottom
                        Spacer(minLength: 160)
                    }
                }

                // Sticky bottom: fade gradient + button + legal
                StickyPaywallBottom(
                    plan: selectedPlan,
                    isPurchasing: isPurchasing,
                    onPurchase: purchase
                )
            }
            .background(Color.plBackground.ignoresSafeArea())
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button { dismiss() } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 22))
                            .foregroundStyle(Color.plForeground.opacity(0.3))
                    }
                }
            }
        }
    }

    private func purchase() {
        isPurchasing = true
        Task {
            try? await Task.sleep(nanoseconds: 2_000_000_000)
            await MainActor.run {
                isPurchasing = false
                appState.isPro = true
                appState.userProfile.isPro = true
                dismiss()
            }
        }
    }
}

// MARK: - Gradient badge (top pill)
// LinearGradient border, dark inner bg, gradient text

struct GradientBadge: View {
    let label: String

    var body: some View {
        ZStack {
            // Gradient outer
            LinearGradient.plPurple
                .clipShape(Capsule())
                .frame(height: 36)
            // Inner bg
            Color.plBackground
                .clipShape(Capsule())
                .padding(2)
            // Label
            Text(label)
                .font(PlFont.body(.semibold))
                .foregroundStyle(Color.plGradientStart)
                .padding(.horizontal, PlSpacing.s3)
        }
        .fixedSize(horizontal: true, vertical: false)
        .frame(height: 36)
        .plShadow(radius: 6)
    }
}

// MARK: - Plan card
// border 2.5pt (selected = gradientEnd, unselected = input),
// floating label on top-right edge

struct PaywallPlanCard: View {
    let plan: ProPaywallView.Plan
    let isSelected: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            ZStack(alignment: .topTrailing) {
                // Card
                HStack(alignment: .bottom, spacing: PlSpacing.s2) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(plan.rawValue)
                            .font(PlFont.subHeading(.semibold))
                            .foregroundStyle(Color.plForeground)
                    }
                    Spacer()
                    // Price — 32pt + subLabel at subHeading opacity 0.4
                    HStack(alignment: .lastTextBaseline, spacing: 4) {
                        Text(plan.price)
                            .font(.system(size: 32, weight: .bold))
                            .foregroundStyle(Color.plForeground)
                        Text(plan.subLabel)
                            .font(PlFont.subHeading())
                            .foregroundStyle(Color.plForeground.opacity(0.4))
                            .padding(.bottom, 4)
                    }
                }
                .padding(.vertical, PlSpacing.s4)
                .padding(.horizontal, PlSpacing.s5)
                .background(Color.plBackground)
                .clipShape(RoundedRectangle(cornerRadius: 16))
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .stroke(isSelected ? Color.plGradientEnd : Color.plInput, lineWidth: 2.5)
                )

                // Floating label — position absolute top -2 right 16
                if let label = plan.floatingLabel {
                    Text(label)
                        .font(.system(size: PlFontSize.body - 2, weight: .semibold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, PlSpacing.s3)
                        .padding(.vertical, PlSpacing.s1)
                        .background(Color.plGradientEnd)
                        .clipShape(Capsule())
                        .offset(x: -PlSpacing.s4, y: -8)
                }
            }
        }
        .padding(.top, 8) // room for floating label
    }
}

// MARK: - Sticky bottom section

struct StickyPaywallBottom: View {
    let plan: ProPaywallView.Plan
    let isPurchasing: Bool
    let onPurchase: () -> Void

    var body: some View {
        VStack(spacing: 0) {
            // Fade gradient overlay (transparent → background)
            LinearGradient(
                colors: [Color.plBackground.opacity(0), Color.plBackground],
                startPoint: .top, endPoint: .bottom
            )
            .frame(height: 40)
            .allowsHitTesting(false)

            VStack(spacing: PlSpacing.s3) {
                // Upgrade button
                Button(action: onPurchase) {
                    HStack {
                        if isPurchasing {
                            ProgressView().tint(.white)
                        }
                        Text(isPurchasing ? "Processing…" : "Subscribe — \(plan.price)\(plan.subLabel)")
                            .font(PlFont.heading(.semibold))
                            .foregroundStyle(.white)
                    }
                    .frame(maxWidth: .infinity)
                    .frame(minHeight: 56)
                    .background(LinearGradient.plPurple)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .disabled(isPurchasing)
                .shadow(color: .black.opacity(0.2), radius: 6, x: 0, y: 0)

                // Legal links
                HStack(spacing: PlSpacing.s1) {
                    Group {
                        Text("Terms").underline()
                        Text("·")
                        Text("Privacy").underline()
                        Text("·")
                        Text("Restore Purchases").underline()
                    }
                    .font(.system(size: PlFontSize.body - 2))
                    .foregroundStyle(Color.plGradientStart)
                }
            }
            .padding(.horizontal, PlSpacing.s4)
            .padding(.bottom, PlSpacing.s8)
            .background(Color.plBackground)
        }
    }
}
