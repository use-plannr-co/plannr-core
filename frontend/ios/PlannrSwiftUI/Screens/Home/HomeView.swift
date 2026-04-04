import SwiftUI

// MARK: - HomeView

struct HomeView: View {
    @EnvironmentObject var appState: AppState
    @State private var showGenerateSchedule = false

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: 0) {

                // PinkSunset-style title, marginTop SPACING_16 (64pt)
                Text("Hello, \(appState.userProfile.displayName) 👋")
                    .font(PlFont.title())
                    .foregroundStyle(Color.plForeground)
                    .padding(.top, PlSpacing.s16)
                    .padding(.horizontal, PlSpacing.s4)
                    .padding(.bottom, PlSpacing.s3)

                Text(todayString)
                    .font(PlFont.subHeading())
                    .foregroundStyle(Color.plForeground.opacity(0.5))
                    .padding(.horizontal, PlSpacing.s4)
                    .padding(.bottom, PlSpacing.s5)

                TimeOfDayCard()
                    .padding(.horizontal, PlSpacing.s4)
                    .padding(.bottom, PlSpacing.s4)

                if let schedule = appState.activeSchedule {
                    ProgressCard(schedule: schedule)
                        .padding(.horizontal, PlSpacing.s4)
                        .padding(.bottom, PlSpacing.s4)
                } else {
                    NoScheduleCTA { showGenerateSchedule = true }
                        .padding(.horizontal, PlSpacing.s4)
                        .padding(.bottom, PlSpacing.s4)
                }

                if !appState.upcomingTasks.isEmpty {
                    UpcomingTasksCard(tasks: appState.upcomingTasks)
                        .padding(.horizontal, PlSpacing.s4)
                        .padding(.bottom, PlSpacing.s4)
                }

                MenuButtonGrid(showGenerateSchedule: $showGenerateSchedule)
                    .padding(.horizontal, PlSpacing.s4)

                Spacer(minLength: 100)
            }
        }
        .background(Color.plBackground.ignoresSafeArea())
        .navigationBarHidden(true)
        .sheet(isPresented: $showGenerateSchedule) { GenerateScheduleView() }
    }

    private var todayString: String {
        let f = DateFormatter(); f.dateFormat = "EEEE, MMMM d"
        return f.string(from: Date())
    }
}

// MARK: - TimeOfDay card (140pt, gradient + dark overlay + white text)

struct TimeOfDayCard: View {
    private var hour: Int { Calendar.current.component(.hour, from: Date()) }

    private var greeting: String {
        switch hour {
        case 5..<12: return "Good morning."
        case 12..<17: return "Good afternoon."
        case 17..<21: return "Good evening."
        default: return "Good night."
        }
    }
    private var subMessage: String {
        switch hour {
        case 5..<12: return "Let's start your day right."
        case 12..<17: return "Keep the momentum going."
        case 17..<21: return "Almost there — finish strong."
        default: return "Rest up for tomorrow."
        }
    }
    private var gradientColors: [Color] {
        switch hour {
        case 5..<12:  return [Color(hex: "#f6a623"), Color(hex: "#e8853d")]
        case 12..<17: return [Color(hex: "#4fc3f7"), Color(hex: "#0277bd")]
        case 17..<21: return [Color(hex: "#ff7043"), Color(hex: "#6a1b9a")]
        default:      return [Color(hex: "#1a237e"), Color(hex: "#4a148c")]
        }
    }

    var body: some View {
        ZStack(alignment: .bottomLeading) {
            LinearGradient(colors: gradientColors, startPoint: .topLeading, endPoint: .bottomTrailing)
            Color.black.opacity(0.3)
            VStack(alignment: .leading, spacing: PlSpacing.s1) {
                Text(greeting)
                    .font(PlFont.title())
                    .foregroundStyle(.white)
                Text(subMessage)
                    .font(PlFont.subHeading())
                    .foregroundStyle(.white.opacity(0.95))
            }
            .padding(PlSpacing.s5)
        }
        .frame(height: 140)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .plShadow(radius: 24)
    }
}

// MARK: - Progress card

struct ProgressCard: View {
    let schedule: Schedule

    var body: some View {
        VStack(alignment: .leading, spacing: PlSpacing.s2) {
            HStack {
                Text(schedule.name)
                    .font(PlFont.subHeading(.semibold))
                    .foregroundStyle(Color.plForeground)
                Spacer()
                Text("\(schedule.completedTasks) / \(schedule.totalTasks) done")
                    .font(PlFont.caption())
                    .foregroundStyle(Color.plForeground.opacity(0.5))
            }

            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    RoundedRectangle(cornerRadius: 16)
                        .fill(Color(hex: "#EAEAEA"))
                        .frame(height: 10)
                    RoundedRectangle(cornerRadius: 16)
                        .fill(LinearGradient(
                            colors: [Color.plGradientStart, Color.plGradientEnd],
                            startPoint: .leading, endPoint: .trailing))
                        .frame(width: max(0, geo.size.width * schedule.completionRate), height: 10)
                }
            }
            .frame(height: 10)

            HStack(spacing: PlSpacing.s2) {
                HStack(spacing: PlSpacing.s2) {
                    Circle().fill(Color.plGreen).frame(width: 8, height: 8)
                    Text("Active")
                        .font(PlFont.small(.medium))
                        .foregroundStyle(Color.plForeground)
                }
                .padding(.horizontal, PlSpacing.s2)
                .padding(.vertical, PlSpacing.s1)
                .background(Color.plGreen.opacity(0.3))
                .overlay(Capsule().stroke(Color.plGreen, lineWidth: 1))
                .clipShape(Capsule())

                Spacer()
                Text("\(Int(schedule.completionRate * 100))% complete")
                    .font(PlFont.caption())
                    .foregroundStyle(Color.plForeground.opacity(0.5))
            }
        }
        .padding(.horizontal, PlSpacing.s4)
        .padding(.vertical, PlSpacing.s3)
        .background(Color.plComp)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .plShadow(radius: 24)
    }
}

// MARK: - No-schedule CTA

struct NoScheduleCTA: View {
    let onTap: () -> Void
    var body: some View {
        Button(action: onTap) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("No active schedule").font(PlFont.subHeading(.semibold)).foregroundStyle(.white)
                    Text("Tap to generate one").font(PlFont.body()).foregroundStyle(.white.opacity(0.8))
                }
                Spacer()
                Image(systemName: "plus.circle.fill").font(.system(size: 28)).foregroundStyle(.white)
            }
            .padding(PlSpacing.s4)
            .background(LinearGradient.plPurple)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .plShadow(radius: 12)
        }
    }
}

// MARK: - Upcoming tasks card

struct UpcomingTasksCard: View {
    let tasks: [TimeBlock]

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("Up next")
                .font(PlFont.subHeading(.semibold))
                .foregroundStyle(Color.plForeground)
                .padding(.bottom, PlSpacing.s3)

            ForEach(Array(tasks.enumerated()), id: \.element.id) { idx, task in
                if idx > 0 {
                    Rectangle()
                        .fill(Color.plForeground.opacity(0.15))
                        .frame(height: 1)
                        .padding(.vertical, PlSpacing.s2)
                }
                HStack(spacing: PlSpacing.s3) {
                    Image(systemName: task.activityType.systemIcon)
                        .font(.system(size: 20))
                        .foregroundStyle(Color.plForeground)
                        .frame(width: 36, height: 36)
                    VStack(alignment: .leading, spacing: PlSpacing.s1) {
                        Text(task.name)
                            .font(PlFont.subHeading(.medium))
                            .foregroundStyle(Color.plForeground)
                            .lineLimit(1)
                        Text(task.timeRangeDisplay)
                            .font(PlFont.caption())
                            .foregroundStyle(Color.plForeground.opacity(0.5))
                    }
                    Spacer()
                }
            }
        }
        .padding(PlSpacing.s4)
        .background(Color.plComp)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .plShadow(radius: 24)
    }
}

// MARK: - MenuButton grid (2 columns, 100pt height)

struct MenuButtonGrid: View {
    @EnvironmentObject var appState: AppState
    @Binding var showGenerateSchedule: Bool

    private var colWidth: CGFloat {
        (UIScreen.main.bounds.width - PlSpacing.s4 * 2 - PlSpacing.s3) / 2
    }
    private var fullWidth: CGFloat { UIScreen.main.bounds.width - PlSpacing.s4 * 2 }

    var body: some View {
        VStack(spacing: PlSpacing.s4) {
            HStack(spacing: PlSpacing.s3) {
                PlannrMenuButton(title: "New Schedule", iconName: "plus.circle.fill", width: colWidth) {
                    showGenerateSchedule = true
                }
                PlannrMenuButton(title: "Today's Tasks", iconName: "checkmark.square.fill", width: colWidth) {
                    appState.selectedTab = .tasks
                }
            }
            if appState.activeSchedule != nil {
                PlannrMenuButton(title: "View Schedule", iconName: "calendar", width: fullWidth) {
                    appState.selectedTab = .tasks
                }
            }
        }
    }
}

struct PlannrMenuButton: View {
    let title: String
    let iconName: String
    let width: CGFloat
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            ZStack {
                Color.plComp
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .plShadow(radius: 12)
                VStack {
                    HStack {
                        Spacer()
                        Image(systemName: iconName)
                            .font(.system(size: 24))
                            .foregroundStyle(Color.plForeground)
                    }
                    Spacer()
                }
                .padding(PlSpacing.s4)
                VStack {
                    Spacer()
                    HStack {
                        Text(title)
                            .font(PlFont.subHeading(.semibold))
                            .foregroundStyle(Color.plForeground)
                            .multilineTextAlignment(.leading)
                            .frame(maxWidth: 130, alignment: .leading)
                        Spacer()
                    }
                }
                .padding(PlSpacing.s4)
            }
            .frame(width: width, height: 100)
        }
    }
}
