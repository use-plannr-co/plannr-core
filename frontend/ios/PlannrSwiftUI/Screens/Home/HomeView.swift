import SwiftUI

// MARK: - HomeView
// Mirrors HomeScreen.jsx — dashboard with greeting, upcoming tasks, progress.

struct HomeView: View {
    @EnvironmentObject var appState: AppState
    @State private var showGenerateSchedule = false

    private var greeting: String {
        let hour = Calendar.current.component(.hour, from: Date())
        switch hour {
        case 5..<12:  return "Good morning"
        case 12..<17: return "Good afternoon"
        case 17..<21: return "Good evening"
        default:      return "Good night"
        }
    }

    private var greetingIcon: String {
        let hour = Calendar.current.component(.hour, from: Date())
        switch hour {
        case 5..<12: return "sun.rise.fill"
        case 12..<17: return "sun.max.fill"
        case 17..<21: return "sun.horizon.fill"
        default: return "moon.stars.fill"
        }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: PlSpacing.s6) {

                // Greeting header
                HStack {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("\(greeting),")
                            .font(PlFont.heading())
                            .foregroundStyle(.secondary)
                        Text(appState.userProfile.displayName)
                            .font(PlFont.title(.bold))
                    }
                    Spacer()
                    Image(systemName: greetingIcon)
                        .font(.system(size: 32))
                        .symbolRenderingMode(.multicolor)
                }

                // Date card
                DateCard()

                // Active schedule / CTA
                if let schedule = appState.activeSchedule {
                    ProgressCard(schedule: schedule)
                } else {
                    NoScheduleCTA { showGenerateSchedule = true }
                }

                // Upcoming tasks
                if !appState.upcomingTasks.isEmpty {
                    UpcomingTasksCard(tasks: appState.upcomingTasks)
                }

                Spacer(minLength: 100)
            }
            .padding(.horizontal, PlSpacing.s4)
            .padding(.top, PlSpacing.s6)
        }
        .navigationTitle("Home")
        .navigationBarHidden(true)
        .sheet(isPresented: $showGenerateSchedule) {
            GenerateScheduleView()
        }
    }
}

// MARK: - Date card

struct DateCard: View {
    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                let fmt: DateFormatter = {
                    let f = DateFormatter(); f.dateFormat = "EEEE"; return f
                }()
                let fmt2: DateFormatter = {
                    let f = DateFormatter(); f.dateFormat = "MMMM d, yyyy"; return f
                }()
                Text(fmt.string(from: Date()))
                    .font(PlFont.heading(.semibold))
                Text(fmt2.string(from: Date()))
                    .font(PlFont.body())
                    .foregroundStyle(.secondary)
            }
            Spacer()
            Image(systemName: "calendar")
                .font(.system(size: 28))
                .foregroundStyle(.plGradientStart)
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}

// MARK: - Progress card

struct ProgressCard: View {
    let schedule: Schedule

    var body: some View {
        VStack(alignment: .leading, spacing: PlSpacing.s3) {
            HStack {
                Text(schedule.name)
                    .font(PlFont.subHeading(.semibold))
                Spacer()
                Text("\(schedule.completedTasks)/\(schedule.totalTasks) done")
                    .font(PlFont.caption())
                    .foregroundStyle(.secondary)
            }

            ProgressView(value: schedule.completionRate)
                .tint(.plGradientStart)
                .scaleEffect(x: 1, y: 1.8, anchor: .center)

            HStack(spacing: PlSpacing.s2) {
                Label("Active", systemImage: "checkmark.seal.fill")
                    .font(PlFont.caption(.semibold))
                    .foregroundStyle(.plGreen)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 4)
                    .background(.plGreen.opacity(0.1))
                    .clipShape(Capsule())
                Spacer()
                Text("\(Int(schedule.completionRate * 100))% complete")
                    .font(PlFont.caption())
                    .foregroundStyle(.secondary)
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}

// MARK: - No-schedule CTA

struct NoScheduleCTA: View {
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("No active schedule")
                        .font(PlFont.subHeading(.semibold))
                        .foregroundStyle(.white)
                    Text("Tap to generate your first one")
                        .font(PlFont.body())
                        .foregroundStyle(.white.opacity(0.8))
                }
                Spacer()
                Image(systemName: "plus.circle.fill")
                    .font(.system(size: 28))
                    .foregroundStyle(.white)
            }
            .padding()
            .background(LinearGradient.plPurple)
            .clipShape(RoundedRectangle(cornerRadius: 16))
        }
    }
}

// MARK: - Upcoming tasks card

struct UpcomingTasksCard: View {
    let tasks: [TimeBlock]

    var body: some View {
        VStack(alignment: .leading, spacing: PlSpacing.s3) {
            Text("Up next")
                .font(PlFont.subHeading(.semibold))

            ForEach(tasks) { task in
                HStack(spacing: PlSpacing.s3) {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color.activityColor(for: task.activityType))
                        .frame(width: 4)

                    VStack(alignment: .leading, spacing: 2) {
                        Text(task.name)
                            .font(PlFont.body(.medium))
                            .lineLimit(1)
                        Text(task.timeRangeDisplay)
                            .font(PlFont.caption())
                            .foregroundStyle(.secondary)
                    }

                    Spacer()

                    Image(systemName: task.activityType.systemIcon)
                        .font(.system(size: 14))
                        .foregroundStyle(Color.activityColor(for: task.activityType))
                }
                .padding(.vertical, 4)
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}
