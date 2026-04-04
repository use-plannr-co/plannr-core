import SwiftUI

// MARK: - SavedSchedulesView
// Schedule card: 202pt tall, background image area, bottom info panel (height 90, absolute),
// active badge with green border + dot.

struct SavedSchedulesView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: 0) {

                Text("Saved Schedules")
                    .font(PlFont.title())
                    .foregroundStyle(Color.plForeground)
                    .padding(.top, PlSpacing.s16)
                    .padding(.horizontal, PlSpacing.s4)
                    .padding(.bottom, PlSpacing.s5)

                if appState.savedSchedules.isEmpty {
                    EmptySchedulesView()
                } else {
                    LazyVStack(spacing: PlSpacing.s3) {
                        ForEach(appState.savedSchedules) { schedule in
                            NavigationLink(destination: ScheduleView(schedule: schedule)) {
                                ScheduleCard(
                                    schedule: schedule,
                                    isActive: appState.activeSchedule?.id == schedule.id
                                )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal, PlSpacing.s4)
                }

                Spacer(minLength: 100)
            }
        }
        .background(Color.plBackground.ignoresSafeArea())
        .navigationBarHidden(true)
    }
}

// MARK: - Schedule card
// 202pt tall, gradient image area fills top, comp-color panel (90pt) at absolute bottom.
// Active badge: green bg 30%, green border, green dot.

struct ScheduleCard: View {
    let schedule: Schedule
    let isActive: Bool

    var body: some View {
        ZStack(alignment: .bottom) {
            // Background image area — gradient fill (image in production)
            LinearGradient(
                colors: [Color.plGradientStart, Color.plGradientEnd],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .frame(height: 202)
            .clipShape(RoundedRectangle(cornerRadius: 12))

            // Decorative circle overlay
            Circle()
                .fill(.white.opacity(0.08))
                .frame(width: 140, height: 140)
                .offset(x: 80, y: -60)

            // Bottom info panel — comp color, 90pt, bottom radius only
            VStack(alignment: .leading, spacing: PlSpacing.s2) {
                Text(schedule.name)
                    .font(PlFont.heading(.semibold))
                    .foregroundStyle(Color.plForeground)

                HStack(spacing: PlSpacing.s3) {
                    Text("\(schedule.startDate.displayString) onwards")
                        .font(PlFont.subHeading())
                        .foregroundStyle(Color.plForeground.opacity(0.5))
                    Spacer()
                    if isActive {
                        ActiveBadge()
                    }
                }
            }
            .padding(PlSpacing.s4)
            .frame(maxWidth: .infinity, alignment: .leading)
            .frame(height: 90)
            .background(Color.plComp)
            .clipShape(
                .rect(topLeadingRadius: 0, bottomLeadingRadius: 12,
                      bottomTrailingRadius: 12, topTrailingRadius: 0)
            )
        }
        .frame(height: 202)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .plShadow(radius: 12)
    }
}

// MARK: - Active badge
// green bg 30%, border 1pt green, green dot 8x8, radius 64 (pill)

struct ActiveBadge: View {
    var body: some View {
        HStack(spacing: PlSpacing.s2) {
            Circle()
                .fill(Color.plGreen)
                .frame(width: 8, height: 8)
            Text("Active")
                .font(PlFont.small(.semibold))
                .foregroundStyle(Color.plForeground)
        }
        .padding(.horizontal, PlSpacing.s2)
        .padding(.vertical, PlSpacing.s1)
        .background(Color.plGreen.opacity(0.3))
        .overlay(Capsule().stroke(Color.plGreen, lineWidth: 1))
        .clipShape(Capsule())
    }
}

struct EmptySchedulesView: View {
    var body: some View {
        VStack(spacing: PlSpacing.s4) {
            Image(systemName: "calendar.badge.exclamationmark")
                .font(.system(size: 64))
                .foregroundStyle(Color.plForeground.opacity(0.2))
                .padding(.top, PlSpacing.s10)
            Text("No saved schedules")
                .font(PlFont.subHeading(.semibold))
                .foregroundStyle(Color.plForeground)
            Text("Generate your first schedule from the Home screen.")
                .font(PlFont.subHeading())
                .foregroundStyle(Color.plForeground.opacity(0.5))
                .multilineTextAlignment(.center)
                .padding(.horizontal, PlSpacing.s8)
        }
        .frame(maxWidth: .infinity)
    }
}
