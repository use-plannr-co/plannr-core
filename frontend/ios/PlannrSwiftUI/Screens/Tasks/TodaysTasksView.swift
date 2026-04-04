import SwiftUI

// MARK: - TodaysTasksView
// Task card matches RN: width 98%, aspect ratio 398/72, radius 12, shadow 0.1/6
// Icon 40x40, name headingSize, time bodySize at opacity 0.5

struct TodaysTasksView: View {
    @EnvironmentObject var appState: AppState

    private var tasks: [TimeBlock] { appState.todaysBlocks }
    private var allDone: Bool {
        !tasks.isEmpty && tasks.filter { $0.blockType != .breakBlock }.allSatisfy { $0.isCompleted }
    }

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: 0) {

                // Title — PinkSunset style, marginTop SPACING_16
                Text("Today's Tasks")
                    .font(PlFont.title())
                    .foregroundStyle(Color.plForeground)
                    .padding(.top, PlSpacing.s16)
                    .padding(.horizontal, PlSpacing.s4)
                    .padding(.bottom, PlSpacing.s3)

                Text("Here's your day for \(ScheduleDate().displayString)")
                    .font(PlFont.subHeading())
                    .foregroundStyle(Color.plForeground.opacity(0.5))
                    .padding(.horizontal, PlSpacing.s4)
                    .padding(.bottom, PlSpacing.s5)

                if tasks.isEmpty {
                    EmptyTasksState()
                } else if allDone {
                    AllDoneState()
                } else {
                    LazyVStack(spacing: PlSpacing.s3) {
                        ForEach(tasks) { task in
                            TaskRow(task: task) { appState.toggleBlockCompletion(task) }
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

// MARK: - Task row
// width 98%, aspect ratio 398/72, radius 12, shadow 0.1/6
// flex row, gap 12, icon 40x40, name headingSize, time bodySize 0.5 opacity

struct TaskRow: View {
    let task: TimeBlock
    let onToggle: () -> Void

    var isBreak: Bool { task.blockType == .breakBlock }

    var body: some View {
        HStack(spacing: PlSpacing.s3) {
            // Activity icon 40x40
            Image(systemName: task.activityType.systemIcon)
                .font(.system(size: 22))
                .foregroundStyle(Color.plForeground)
                .frame(width: 40, height: 40)

            VStack(alignment: .leading, spacing: PlSpacing.s1) {
                Text(task.name)
                    .font(PlFont.heading(.semibold))
                    .foregroundStyle(Color.plForeground)
                    .strikethrough(task.isCompleted, color: Color.plForeground.opacity(0.3))
                    .lineLimit(1)
                Text(task.timeRangeDisplay)
                    .font(PlFont.body())
                    .foregroundStyle(Color.plForeground.opacity(0.5))
            }

            Spacer()

            if !isBreak {
                PlannrCheckbox(isChecked: task.isCompleted, onToggle: onToggle)
            }
        }
        .padding(PlSpacing.s4)
        .frame(maxWidth: .infinity)
        .background(Color.plComp)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .plShadow(radius: 6)
        .opacity(task.isCompleted && !isBreak ? 0.6 : 1)
    }
}

// MARK: - Checkbox

struct PlannrCheckbox: View {
    let isChecked: Bool
    let onToggle: () -> Void
    @State private var scale: CGFloat = 1

    var body: some View {
        Button(action: {
            withAnimation(.spring(response: 0.25, dampingFraction: 0.6)) { scale = 0.75 }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.12) {
                withAnimation(.spring(response: 0.25)) { scale = 1 }
            }
            onToggle()
        }) {
            ZStack {
                RoundedRectangle(cornerRadius: 6)
                    .stroke(isChecked ? Color.plForeground : Color.plForeground.opacity(0.3), lineWidth: 2)
                    .frame(width: 24, height: 24)
                if isChecked {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color.plForeground)
                        .frame(width: 14, height: 14)
                }
            }
        }
        .scaleEffect(scale)
    }
}

// MARK: - Empty states

struct EmptyTasksState: View {
    var body: some View {
        VStack(spacing: PlSpacing.s4) {
            Image(systemName: "moon.zzz.fill")
                .font(.system(size: 64))
                .foregroundStyle(Color.plForeground.opacity(0.2))
                .padding(.top, PlSpacing.s10)
            Text("Nothing scheduled today")
                .font(PlFont.subHeading(.semibold))
                .foregroundStyle(Color.plForeground)
            Text("Generate a schedule to get started.")
                .font(PlFont.subHeading())
                .foregroundStyle(Color.plForeground.opacity(0.5))
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
    }
}

struct AllDoneState: View {
    var body: some View {
        VStack(spacing: PlSpacing.s4) {
            Image(systemName: "checkmark.seal.fill")
                .font(.system(size: 64))
                .foregroundStyle(Color.plGradientStart.opacity(0.8))
                .padding(.top, PlSpacing.s10)
            Text("All done! 🎉")
                .font(PlFont.heading(.bold))
                .foregroundStyle(Color.plForeground)
            Text("You've completed everything for today.")
                .font(PlFont.subHeading())
                .foregroundStyle(Color.plForeground.opacity(0.5))
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
    }
}
