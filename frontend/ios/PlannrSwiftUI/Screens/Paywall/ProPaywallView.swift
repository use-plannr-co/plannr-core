import SwiftUI

// MARK: - ProPaywallView
// Mirrors ProPaywallScreen.jsx — subscription purchase UI backed by RevenueCat.

struct ProPaywallView: View {
    @EnvironmentObject var appState: AppState
    @Environment(\.dismiss) private var dismiss

    @State private var selectedPlan: Plan = .annual
    @State private var isPurchasing = false

    enum Plan: String, CaseIterable {
        case monthly = "Monthly"
        case annual  = "Annual"

        var price: String {
            switch self {
            case .monthly: return "$6.99 / month"
            case .annual:  return "$55.99 / year"
            }
        }

        var savings: String? {
            self == .annual ? "Best value — 33% off" : nil
        }

        var monthlyEquivalent: String {
            switch self {
            case .monthly: return "$6.99"
            case .annual:  return "$4.67"
            }
        }
    }

    private let features: [(icon: String, color: Color, title: String, detail: String)] = [
        ("infinity",             .plGradientStart, "Unlimited Schedules",  "Create as many schedules as you need"),
        ("sparkles",             .plGradientEnd,   "Unlimited AI Chat",     "Chat without daily message limits"),
        ("person.2.fill",        .plOrange,        "Co-planning",           "Collaborate on schedules with others"),
        ("chart.bar.fill",       .plGreen,         "Productivity Analytics","Detailed insights into your work habits"),
    ]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 0) {

                    // Hero
                    ZStack {
                        LinearGradient.plPurple.ignoresSafeArea()
                        VStack(spacing: PlSpacing.s3) {
                            Image(systemName: "crown.fill")
                                .font(.system(size: 48))
                                .foregroundStyle(.white)
                                .shadow(radius: 8)
                            Text("Plannr Pro")
                                .font(PlFont.title(.black))
                                .foregroundStyle(.white)
                            Text("The smartest way to own your time.")
                                .font(PlFont.body())
                                .foregroundStyle(.white.opacity(0.85))
                                .multilineTextAlignment(.center)
                        }
                        .padding(.vertical, PlSpacing.s10)
                    }
                    .frame(height: 220)

                    VStack(spacing: PlSpacing.s6) {

                        // Features list
                        VStack(spacing: PlSpacing.s3) {
                            ForEach(features, id: \.title) { f in
                                ProFeatureRow(icon: f.icon, color: f.color,
                                              title: f.title, detail: f.detail)
                            }
                        }
                        .padding(.top, PlSpacing.s6)

                        // Plan selector
                        VStack(spacing: PlSpacing.s3) {
                            Text("Choose a plan")
                                .font(PlFont.subHeading(.semibold))
                                .frame(maxWidth: .infinity, alignment: .leading)

                            HStack(spacing: PlSpacing.s3) {
                                ForEach(Plan.allCases, id: \.rawValue) { plan in
                                    PlanCard(plan: plan, isSelected: selectedPlan == plan) {
                                        selectedPlan = plan
                                    }
                                }
                            }
                        }

                        // Price & CTA
                        VStack(spacing: PlSpacing.s3) {
                            Text("Just \(selectedPlan.monthlyEquivalent) / month")
                                .font(PlFont.heading(.bold))

                            PlButton(title: isPurchasing ? "Processing…" : "Subscribe — \(selectedPlan.price)") {
                                purchase()
                            }
                            .disabled(isPurchasing)

                            Button("Restore Purchases") {
                                // RevenueCat: Purchases.shared.restorePurchases()
                            }
                            .font(PlFont.body())
                            .foregroundStyle(.secondary)
                        }

                        // Legal
                        HStack(spacing: PlSpacing.s4) {
                            Link("Terms", destination: URL(string: "https://plannr.app/terms")!)
                            Text("·").foregroundStyle(.secondary)
                            Link("Privacy", destination: URL(string: "https://plannr.app/privacy")!)
                            Text("·").foregroundStyle(.secondary)
                            Link("Manage Subscription", destination: URL(string: "https://apps.apple.com/account/subscriptions")!)
                        }
                        .font(PlFont.caption())
                        .foregroundStyle(.secondary)

                        Spacer(minLength: 40)
                    }
                    .padding(.horizontal, PlSpacing.s4)
                }
            }
            .ignoresSafeArea(edges: .top)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button(action: { dismiss() }) {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
    }

    private func purchase() {
        isPurchasing = true
        // In production: RevenueCat Purchases.shared.purchase(package: selectedPackage)
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

// MARK: - Pro feature row

struct ProFeatureRow: View {
    let icon: String
    let color: Color
    let title: String
    let detail: String

    var body: some View {
        HStack(spacing: PlSpacing.s4) {
            ZStack {
                RoundedRectangle(cornerRadius: 10)
                    .fill(color.opacity(0.15))
                    .frame(width: 44, height: 44)
                Image(systemName: icon)
                    .font(.system(size: 18))
                    .foregroundStyle(color)
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(PlFont.body(.semibold))
                Text(detail).font(PlFont.caption()).foregroundStyle(.secondary)
            }
            Spacer()
            Image(systemName: "checkmark.circle.fill")
                .foregroundStyle(.plGreen)
        }
    }
}

// MARK: - Plan card

struct PlanCard: View {
    let plan: ProPaywallView.Plan
    let isSelected: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(spacing: PlSpacing.s2) {
                if let savings = plan.savings {
                    Text(savings)
                        .font(PlFont.caption(.bold))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(.plGreen)
                        .clipShape(Capsule())
                }
                Text(plan.rawValue)
                    .font(PlFont.subHeading(.semibold))
                    .foregroundStyle(isSelected ? .plGradientStart : .primary)
                Text(plan.price)
                    .font(PlFont.caption())
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity)
            .padding()
            .background(Color(.secondarySystemBackground))
            .clipShape(RoundedRectangle(cornerRadius: 14))
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .stroke(isSelected ? .plGradientStart : Color.clear, lineWidth: 2)
            )
        }
    }
}
