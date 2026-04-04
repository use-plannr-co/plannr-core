import SwiftUI
import Charts   // requires iOS 16+

// MARK: - ProductivityAnalyticsView
// Mirrors ProductivityAnalyticsScreen.jsx — charts for task completion rates.
// Pro-gated. Uses Swift Charts (iOS 16+) instead of react-native-gifted-charts.

struct ProductivityAnalyticsView: View {
    @EnvironmentObject var appState: AppState
    @State private var selectedPeriod: Period = .week
    @State private var mood: Mood? = nil

    enum Period: String, CaseIterable {
        case week = "7 Days"
        case month = "30 Days"
        case allTime = "All Time"
    }

    enum Mood: String, CaseIterable {
        case great = "😄"; case good = "🙂"; case okay = "😐"; case bad = "😞"
    }

    // Demo data
    private var completionTrend: [(label: String, value: Double)] {
        let days = selectedPeriod == .week ? 7 : selectedPeriod == .month ? 30 : 90
        return (0..<min(days, 14)).map { i in
            let d = Calendar.current.date(byAdding: .day, value: -i, to: Date())!
            let fmt = DateFormatter(); fmt.dateFormat = "MMM d"
            return (label: fmt.string(from: d), value: Double.random(in: 0.4...1.0))
        }
        .reversed()
    }

    private var byDayOfWeek: [(day: String, rate: Double)] {
        ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
            .map { ($0, Double.random(in: 0.3...1.0)) }
    }

    private var byCategory: [(type: ActivityType, rate: Double)] {
        ActivityType.allCases.filter { $0 != .breakTime }
            .map { ($0, Double.random(in: 0.3...1.0)) }
    }

    var body: some View {
        ProGate {
            ScrollView {
                VStack(spacing: PlSpacing.s6) {

                    // Period tabs
                    Picker("Period", selection: $selectedPeriod) {
                        ForEach(Period.allCases, id: \.rawValue) { p in
                            Text(p.rawValue).tag(p)
                        }
                    }
                    .pickerStyle(.segmented)

                    // Completion trend line chart
                    ChartCard(title: "Completion Rate", subtitle: "% tasks completed per day") {
                        Chart(completionTrend, id: \.label) { point in
                            LineMark(
                                x: .value("Day", point.label),
                                y: .value("Rate", point.value)
                            )
                            .foregroundStyle(LinearGradient.plPurple)
                            .interpolationMethod(.catmullRom)

                            AreaMark(
                                x: .value("Day", point.label),
                                y: .value("Rate", point.value)
                            )
                            .foregroundStyle(
                                LinearGradient(colors: [.plGradientStart.opacity(0.3), .clear],
                                               startPoint: .top, endPoint: .bottom)
                            )
                            .interpolationMethod(.catmullRom)
                        }
                        .chartYScale(domain: 0...1)
                        .chartXAxis(.hidden)
                        .frame(height: 160)
                    }

                    // Day of week bar chart
                    ChartCard(title: "By Day of Week", subtitle: "Average completion rate") {
                        Chart(byDayOfWeek, id: \.day) { item in
                            BarMark(
                                x: .value("Day", item.day),
                                y: .value("Rate", item.rate)
                            )
                            .foregroundStyle(
                                item.rate > 0.7 ? Color.plGreen : item.rate > 0.4 ? Color.plGradientStart : Color.plOrange
                            )
                            .cornerRadius(4)
                        }
                        .chartYScale(domain: 0...1)
                        .frame(height: 160)
                    }

                    // Category breakdown
                    ChartCard(title: "By Category", subtitle: "Completion rate per activity type") {
                        VStack(spacing: PlSpacing.s3) {
                            ForEach(byCategory, id: \.type) { item in
                                HStack(spacing: PlSpacing.s3) {
                                    Image(systemName: item.type.systemIcon)
                                        .font(.system(size: 14))
                                        .foregroundStyle(Color.activityColor(for: item.type))
                                        .frame(width: 20)

                                    Text(item.type.displayName)
                                        .font(PlFont.body())
                                        .frame(width: 90, alignment: .leading)

                                    GeometryReader { geo in
                                        ZStack(alignment: .leading) {
                                            RoundedRectangle(cornerRadius: 4)
                                                .fill(Color.plInput)
                                            RoundedRectangle(cornerRadius: 4)
                                                .fill(Color.activityColor(for: item.type))
                                                .frame(width: geo.size.width * item.rate)
                                        }
                                    }
                                    .frame(height: 8)

                                    Text("\(Int(item.rate * 100))%")
                                        .font(PlFont.caption(.semibold))
                                        .frame(width: 36, alignment: .trailing)
                                }
                            }
                        }
                    }

                    // Mood checkin
                    MoodCheckinCard(mood: $mood)

                    Spacer(minLength: 100)
                }
                .padding(.horizontal, PlSpacing.s4)
                .padding(.top, PlSpacing.s4)
            }
            .navigationTitle("Analytics")
        }
    }
}

// MARK: - Chart card container

struct ChartCard<Content: View>: View {
    let title: String
    let subtitle: String
    @ViewBuilder let content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: PlSpacing.s3) {
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(PlFont.subHeading(.semibold))
                Text(subtitle).font(PlFont.caption()).foregroundStyle(Color.plForeground.opacity(0.5))
            }
            content()
        }
        .padding()
        .background(Color.plComp)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}

// MARK: - Mood checkin

struct MoodCheckinCard: View {
    @Binding var mood: ProductivityAnalyticsView.Mood?

    var body: some View {
        VStack(alignment: .leading, spacing: PlSpacing.s3) {
            Text("How are you feeling today?")
                .font(PlFont.subHeading(.semibold))
            HStack(spacing: PlSpacing.s4) {
                ForEach(ProductivityAnalyticsView.Mood.allCases, id: \.rawValue) { m in
                    Button(action: { mood = m }) {
                        Text(m.rawValue)
                            .font(.system(size: 32))
                            .scaleEffect(mood == m ? 1.3 : 1)
                            .animation(.spring(response: 0.3), value: mood)
                    }
                }
            }
            if let m = mood {
                Text("Logged: \(m.rawValue) for today")
                    .font(PlFont.caption())
                    .foregroundStyle(Color.plForeground.opacity(0.5))
            }
        }
        .padding()
        .background(Color.plComp)
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}

// MARK: - ProGate
// Wraps content behind a paywall if the user is not Pro.

struct ProGate<Content: View>: View {
    @EnvironmentObject var appState: AppState
    @ViewBuilder let content: () -> Content
    @State private var showPaywall = false

    var body: some View {
        if appState.isPro {
            content()
        } else {
            VStack(spacing: PlSpacing.s5) {
                Spacer()
                Image(systemName: "crown.fill")
                    .font(.system(size: 48))
                    .foregroundStyle(.plGradientStart)
                Text("Pro Feature")
                    .font(PlFont.heading(.bold))
                Text("Unlock detailed productivity analytics and more with Plannr Pro.")
                    .font(PlFont.body())
                    .foregroundStyle(Color.plForeground.opacity(0.5))
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, PlSpacing.s8)
                PlButton(title: "Unlock Pro") { showPaywall = true }
                    .padding(.horizontal, PlSpacing.s4)
                Spacer()
            }
            .sheet(isPresented: $showPaywall) { ProPaywallView() }
        }
    }
}
