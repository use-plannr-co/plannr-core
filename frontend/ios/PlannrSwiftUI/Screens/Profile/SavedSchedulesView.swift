import SwiftUI

// MARK: - SavedSchedulesView
// Mirrors SavedSchedulesScreen.jsx — grid of all saved schedules.

struct SavedSchedulesView: View {
    @EnvironmentObject var appState: AppState

    var body: some View {
        Group {
            if appState.savedSchedules.isEmpty {
                EmptySchedulesView()
            } else {
                List {
                    ForEach(appState.savedSchedules) { schedule in
                        NavigationLink(destination: ScheduleView(schedule: schedule)) {
                            ScheduleCard(schedule: schedule,
                                         isActive: appState.activeSchedule?.id == schedule.id)
                        }
                        .listRowInsets(EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16))
                        .listRowBackground(Color.clear)
                        .listRowSeparator(.hidden)
                    }
                    .onDelete { offsets in
                        offsets.forEach { idx in
                            let s = appState.savedSchedules[idx]
                            if appState.activeSchedule?.id == s.id {
                                appState.activeSchedule = nil
                            }
                        }
                        appState.savedSchedules.remove(atOffsets: offsets)
                    }
                }
                .listStyle(.plain)
            }
        }
        .navigationTitle("Saved Schedules")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Schedule card

struct ScheduleCard: View {
    let schedule: Schedule
    let isActive: Bool

    var body: some View {
        ZStack(alignment: .bottomLeading) {
            // Gradient background
            LinearGradient(
                colors: [.plGradientStart, .plGradientEnd],
                startPoint: .topLeading, endPoint: .bottomTrailing
            )
            .clipShape(RoundedRectangle(cornerRadius: 18))

            // Decorative circle
            Circle()
                .fill(.white.opacity(0.08))
                .frame(width: 120, height: 120)
                .offset(x: 160, y: -30)

            VStack(alignment: .leading, spacing: PlSpacing.s2) {
                if isActive {
                    Text("ACTIVE")
                        .font(.system(size: 10, weight: .black))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(.white.opacity(0.25))
                        .clipShape(Capsule())
                }
                Text(schedule.name)
                    .font(PlFont.heading(.bold))
                    .foregroundStyle(.white)
                Text("\(schedule.startDate.displayString) onwards")
                    .font(PlFont.caption())
                    .foregroundStyle(.white.opacity(0.8))
                HStack {
                    Text("\(schedule.totalTasks) tasks")
                    Text("·")
                    Text("\(schedule.days.count) days")
                }
                .font(PlFont.caption())
                .foregroundStyle(.white.opacity(0.7))
            }
            .padding()
        }
        .frame(height: 120)
    }
}

struct EmptySchedulesView: View {
    var body: some View {
        VStack(spacing: PlSpacing.s4) {
            Image(systemName: "calendar.badge.exclamationmark")
                .font(.system(size: 60))
                .foregroundStyle(.plGradientStart.opacity(0.6))
            Text("No saved schedules")
                .font(PlFont.heading())
            Text("Generate your first schedule from the Home screen.")
                .font(PlFont.body())
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, PlSpacing.s8)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
