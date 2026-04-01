import SwiftUI

// MARK: - TodaysTasksView
// Mirrors TodaysTasksScreen.jsx — checklist of today's time blocks.

struct TodaysTasksView: View {
    @EnvironmentObject var appState: AppState

    private var tasks: [TimeBlock] {
        appState.todaysBlocks
    }

    private var allDone: Bool {
        !tasks.isEmpty && tasks.filter { $0.blockType != .breakBlock }.allSatisfy { $0.isCompleted }
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: PlSpacing.s4) {

                // Subtitle
                Text("Here's your day for \(ScheduleDate().displayString)")
                    .font(PlFont.body())
                    .foregroundStyle(.secondary)

                if tasks.isEmpty {
                    EmptyTasksState()
                } else if allDone {
                    AllDoneState()
                } else {
                    taskList
                }

                Spacer(minLength: 100)
            }
            .padding(.horizontal, PlSpacing.s4)
            .padding(.top, PlSpacing.s4)
        }
        .navigationTitle("Today's Tasks")
    }

    // MARK: Task list

    @ViewBuilder var taskList: some View {
        LazyVStack(spacing: PlSpacing.s3) {
            ForEach(tasks) { task in
                TaskRow(task: task) {
                    appState.toggleBlockCompletion(task)
                }
                .transition(.opacity.combined(with: .move(edge: .trailing)))
            }
        }
        .animation(.spring(response: 0.4), value: tasks.map { $0.isCompleted })
    }
}

// MARK: - Task row

struct TaskRow: View {
    let task: TimeBlock
    let onToggle: () -> Void

    var isBreak: Bool { task.blockType == .breakBlock }

    var body: some View {
        HStack(spacing: PlSpacing.s3) {

            // Left color bar
            RoundedRectangle(cornerRadius: 3)
                .fill(Color.activityColor(for: task.activityType))
                .frame(width: 4)

            // Icon
            ZStack {
                Circle()
                    .fill(Color.activityColor(for: task.activityType).opacity(0.15))
                    .frame(width: 36, height: 36)
                Image(systemName: task.activityType.systemIcon)
                    .font(.system(size: 14))
                    .foregroundStyle(Color.activityColor(for: task.activityType))
            }

            // Info
            VStack(alignment: .leading, spacing: 2) {
                Text(task.name)
                    .font(PlFont.body(.medium))
                    .strikethrough(task.isCompleted, color: .secondary)
                    .foregroundStyle(task.isCompleted ? .secondary : .primary)
                    .lineLimit(1)

                Text(task.timeRangeDisplay)
                    .font(PlFont.caption())
                    .foregroundStyle(.secondary)
            }

            Spacer()

            // Checkbox (hidden for breaks)
            if !isBreak {
                CheckboxView(isChecked: task.isCompleted, onToggle: onToggle)
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 14))
        .opacity(task.isCompleted ? 0.6 : 1)
    }
}

// MARK: - Checkbox

struct CheckboxView: View {
    let isChecked: Bool
    let onToggle: () -> Void
    @State private var scale: CGFloat = 1

    var body: some View {
        Button(action: {
            withAnimation(.spring(response: 0.3, dampingFraction: 0.6)) {
                scale = 0.8
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
                withAnimation(.spring(response: 0.3)) { scale = 1 }
            }
            onToggle()
        }) {
            ZStack {
                RoundedRectangle(cornerRadius: 6)
                    .stroke(isChecked ? .plGreen : Color(.tertiaryLabel), lineWidth: 2)
                    .frame(width: 24, height: 24)
                    .background(isChecked ? .plGreen.opacity(0.1) : .clear)
                    .clipShape(RoundedRectangle(cornerRadius: 6))

                if isChecked {
                    Image(systemName: "checkmark")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundStyle(.plGreen)
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
                .foregroundStyle(.plGradientStart.opacity(0.6))
                .padding(.top, 40)
            Text("Nothing scheduled today")
                .font(PlFont.heading())
            Text("Generate a schedule to get started.")
                .font(PlFont.body())
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
    }
}

struct AllDoneState: View {
    var body: some View {
        VStack(spacing: PlSpacing.s4) {
            ZStack {
                Circle()
                    .fill(LinearGradient.plPurple)
                    .frame(width: 80, height: 80)
                    .opacity(0.2)
                Image(systemName: "checkmark.seal.fill")
                    .font(.system(size: 48))
                    .foregroundStyle(.plGradientStart)
            }
            .padding(.top, 40)
            Text("All done! 🎉")
                .font(PlFont.heading(.bold))
            Text("You've completed everything for today.")
                .font(PlFont.body())
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
    }
}
