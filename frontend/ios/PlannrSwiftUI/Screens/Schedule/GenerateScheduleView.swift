import SwiftUI

// MARK: - GenerateScheduleView
// Mirrors GenerateScheduleScreen.jsx — 5-stage wizard that collects schedule config,
// parses tasks via AI, reviews them, adds busy times, adds breaks, then generates.

struct GenerateScheduleView: View {
    @EnvironmentObject var appState: AppState
    @Environment(\.dismiss) private var dismiss

    @State private var stage: Stage = .setup
    @State private var config  = ScheduleConfig()
    @State private var isGenerating = false
    @State private var showError = false
    @State private var errorMessage = ""

    enum Stage: Int, CaseIterable {
        case setup, addTasks, reviewTasks, busyTimes, finishUp

        var title: String {
            switch self {
            case .setup:       return "Set Up"
            case .addTasks:    return "Add Tasks"
            case .reviewTasks: return "Review"
            case .busyTimes:   return "Busy Times"
            case .finishUp:    return "Finish Up"
            }
        }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Progress bar
                StageProgressBar(currentStage: stage)
                    .padding(.horizontal, PlSpacing.s4)
                    .padding(.top, PlSpacing.s4)

                // Stage content
                ScrollView {
                    VStack(spacing: PlSpacing.s6) {
                        switch stage {
                        case .setup:       SetupStageView(config: $config)
                        case .addTasks:    AddTasksStageView(config: $config)
                        case .reviewTasks: ReviewTasksStageView(config: $config)
                        case .busyTimes:   BusyTimesStageView(config: $config)
                        case .finishUp:    FinishUpStageView(config: $config)
                        }
                    }
                    .padding(.horizontal, PlSpacing.s4)
                    .padding(.vertical, PlSpacing.s6)
                }

                // Navigation buttons
                HStack(spacing: PlSpacing.s3) {
                    if stage != .setup {
                        Button("Back") {
                            withAnimation(.easeInOut(duration: 0.2)) {
                                stage = Stage(rawValue: stage.rawValue - 1) ?? .setup
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color(.secondarySystemBackground))
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                    }

                    if stage == .finishUp {
                        PlButton(title: isGenerating ? "Generating…" : "Generate Schedule") {
                            generate()
                        }
                        .disabled(isGenerating)
                    } else {
                        PlButton(title: "Continue") {
                            withAnimation(.easeInOut(duration: 0.2)) {
                                stage = Stage(rawValue: stage.rawValue + 1) ?? .finishUp
                            }
                        }
                        .disabled(!canProceed)
                    }
                }
                .padding(.horizontal, PlSpacing.s4)
                .padding(.bottom, PlSpacing.s6)
            }
            .navigationTitle("New Schedule")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { dismiss() }
                }
            }
            .alert("Scheduling Error", isPresented: $showError) {
                Button("Recheck") { stage = .reviewTasks }
                Button("Cancel", role: .cancel) { dismiss() }
            } message: {
                Text(errorMessage)
            }
        }
    }

    private var canProceed: Bool {
        switch stage {
        case .setup: return !config.name.isEmpty
        default: return true
        }
    }

    private func generate() {
        isGenerating = true
        // Simulate schedule generation (in production this would call the Scheduler algorithm)
        Task {
            try? await Task.sleep(nanoseconds: 2_000_000_000)
            await MainActor.run {
                isGenerating = false
                // Build a demo schedule from config
                let today = config.startDate
                var days: [ScheduleDate: Day] = [:]
                for i in 0..<config.numDays {
                    let date = today.advanced(by: i)
                    var blocks: [TimeBlock] = []
                    for (idx, event) in config.flexibleEvents.enumerated() {
                        let start = Time24(900 + idx * 120)
                        let end   = start.adding(minutes: event.duration)
                        blocks.append(TimeBlock(
                            name: event.name, blockType: .flexible,
                            date: date, startTime: start, endTime: end,
                            activityType: event.activityType, priority: event.priority
                        ))
                    }
                    days[date] = Day(date: date, blocks: blocks)
                }
                let newSchedule = Schedule(
                    name: config.name,
                    strategy: config.strategy,
                    startDate: today,
                    days: days
                )
                appState.savedSchedules.append(newSchedule)
                appState.activeSchedule = newSchedule
                dismiss()
            }
        }
    }
}

// MARK: - Schedule config model (wizard state)

struct ScheduleConfig {
    var name: String = ""
    var numDays: Int = 7
    var startDate: ScheduleDate = ScheduleDate()
    var strategy: SchedulingStrategy = .balancedWork
    var minGap: Int = 15
    var workingHoursLimit: Double = 8
    var taskInputText: String = ""
    var flexibleEvents: [FlexibleEvent] = []
    var rigidEvents: [RigidEvent] = []
    var breaks: [BreakSlot] = []
    var busyTimes: [RigidEvent] = []
}

// MARK: - Stage: Setup

struct SetupStageView: View {
    @Binding var config: ScheduleConfig

    var body: some View {
        VStack(alignment: .leading, spacing: PlSpacing.s5) {
            StageSectionHeader(icon: "gearshape.fill", title: "Basic Settings",
                               subtitle: "Give your schedule a name and set working preferences.")

            PlTextField(placeholder: "Schedule name (e.g. Work Week)", text: $config.name)

            StepperField(label: "Number of days", value: $config.numDays, range: 1...30)

            VStack(alignment: .leading, spacing: PlSpacing.s2) {
                Text("Strategy")
                    .font(PlFont.body(.medium))
                ForEach(SchedulingStrategy.allCases, id: \.rawValue) { strategy in
                    StrategyPill(strategy: strategy, isSelected: config.strategy == strategy) {
                        config.strategy = strategy
                    }
                }
            }

            StepperField(label: "Min gap between events (min)", value: $config.minGap, range: 0...60, step: 5)
        }
    }
}

// MARK: - Stage: Add tasks

struct AddTasksStageView: View {
    @Binding var config: ScheduleConfig
    @State private var isParsing = false

    var body: some View {
        VStack(alignment: .leading, spacing: PlSpacing.s5) {
            StageSectionHeader(icon: "text.badge.plus", title: "Add Tasks",
                               subtitle: "Describe your tasks in plain English and let AI parse them.")

            ZStack(alignment: .topLeading) {
                TextEditor(text: $config.taskInputText)
                    .frame(minHeight: 140)
                    .padding(8)
                    .background(Color(.secondarySystemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 12))

                if config.taskInputText.isEmpty {
                    Text("e.g. Write report for 2 hours, high priority, due Friday")
                        .font(PlFont.body())
                        .foregroundStyle(.tertiary)
                        .padding(.top, 16)
                        .padding(.leading, 12)
                        .allowsHitTesting(false)
                }
            }

            PlButton(title: isParsing ? "Parsing with AI…" : "Parse with AI") {
                parseTasks()
            }
            .disabled(config.taskInputText.isEmpty || isParsing)
        }
    }

    private func parseTasks() {
        isParsing = true
        Task {
            try? await Task.sleep(nanoseconds: 1_500_000_000)
            await MainActor.run {
                isParsing = false
                // Simulate AI parsing
                config.flexibleEvents = [
                    FlexibleEvent(name: "Write report", duration: 120, priority: .high,
                                  activityType: .work),
                    FlexibleEvent(name: "Code review", duration: 60, priority: .medium,
                                  activityType: .work),
                    FlexibleEvent(name: "Team meeting", duration: 30, priority: .high,
                                  activityType: .meeting),
                ]
            }
        }
    }
}

// MARK: - Stage: Review tasks

struct ReviewTasksStageView: View {
    @Binding var config: ScheduleConfig

    var body: some View {
        VStack(alignment: .leading, spacing: PlSpacing.s5) {
            StageSectionHeader(icon: "checklist", title: "Review Tasks",
                               subtitle: "Verify and edit your parsed tasks.")

            if config.flexibleEvents.isEmpty {
                Text("No tasks yet — go back and add some.")
                    .font(PlFont.body())
                    .foregroundStyle(.secondary)
            } else {
                ForEach($config.flexibleEvents) { $event in
                    EventReviewCard(event: $event) {
                        config.flexibleEvents.removeAll { $0.id == event.id }
                    }
                }
            }

            Button(action: {
                config.flexibleEvents.append(
                    FlexibleEvent(name: "", duration: 60, priority: .medium, activityType: .work)
                )
            }) {
                Label("Add task manually", systemImage: "plus")
                    .font(PlFont.body(.medium))
                    .foregroundStyle(.plGradientStart)
            }
        }
    }
}

struct EventReviewCard: View {
    @Binding var event: FlexibleEvent
    let onDelete: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: PlSpacing.s3) {
            HStack {
                TextField("Task name", text: $event.name)
                    .font(PlFont.body(.medium))
                Spacer()
                Button(action: onDelete) {
                    Image(systemName: "trash")
                        .foregroundStyle(.red)
                }
            }

            HStack(spacing: PlSpacing.s3) {
                StepperField(label: "Duration (min)", value: $event.duration, range: 15...480, step: 15)
                Spacer()
                Picker("Priority", selection: $event.priority) {
                    ForEach(Priority.allCases, id: \.rawValue) { p in
                        Text(p.displayName).tag(p)
                    }
                }
                .pickerStyle(.menu)
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

// MARK: - Stage: Busy times

struct BusyTimesStageView: View {
    @Binding var config: ScheduleConfig
    @State private var showAdd = false

    var body: some View {
        VStack(alignment: .leading, spacing: PlSpacing.s5) {
            StageSectionHeader(icon: "calendar.badge.minus", title: "Busy Times",
                               subtitle: "Block off times you're not available.")

            if config.busyTimes.isEmpty {
                Text("No busy times added.")
                    .font(PlFont.body())
                    .foregroundStyle(.secondary)
            } else {
                ForEach(config.busyTimes) { busy in
                    HStack {
                        VStack(alignment: .leading) {
                            Text(busy.name).font(PlFont.body(.medium))
                            Text(busy.startTime.display12 + " – " +
                                 busy.startTime.adding(minutes: busy.duration).display12)
                                .font(PlFont.caption())
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                        Button(action: {
                            config.busyTimes.removeAll { $0.id == busy.id }
                        }) { Image(systemName: "xmark").foregroundStyle(.red) }
                    }
                    .padding()
                    .background(Color(.secondarySystemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
            }

            PlButton(title: "Add Busy Time") { showAdd = true }
                .frame(maxWidth: .infinity)
        }
        .sheet(isPresented: $showAdd) {
            AddBusyTimeSheet(onAdd: { name, start, duration in
                let date = config.startDate
                config.busyTimes.append(RigidEvent(name: name, duration: duration,
                                                    activityType: .other, date: date,
                                                    startTime: start))
            })
        }
    }
}

struct AddBusyTimeSheet: View {
    @Environment(\.dismiss) var dismiss
    let onAdd: (String, Time24, Int) -> Void
    @State private var name = ""
    @State private var hour = 9
    @State private var minute = 0
    @State private var duration = 60

    var body: some View {
        NavigationStack {
            Form {
                Section("Details") {
                    TextField("Name (e.g. Doctor appointment)", text: $name)
                    Picker("Start hour", selection: $hour) {
                        ForEach(0..<24) { Text("\($0):00").tag($0) }
                    }
                    StepperField(label: "Duration (min)", value: $duration, range: 15...480, step: 15)
                }
            }
            .navigationTitle("Add Busy Time")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading)  { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Add") {
                        onAdd(name, Time24(hour * 100 + minute), duration)
                        dismiss()
                    }
                    .disabled(name.isEmpty)
                }
            }
        }
    }
}

// MARK: - Stage: Finish up

struct FinishUpStageView: View {
    @Binding var config: ScheduleConfig

    var body: some View {
        VStack(alignment: .leading, spacing: PlSpacing.s5) {
            StageSectionHeader(icon: "checkmark.circle.fill", title: "Finish Up",
                               subtitle: "Review and generate your schedule.")

            SummaryRow(label: "Name",     value: config.name.isEmpty ? "—" : config.name)
            SummaryRow(label: "Days",     value: "\(config.numDays)")
            SummaryRow(label: "Strategy", value: config.strategy.displayName)
            SummaryRow(label: "Tasks",    value: "\(config.flexibleEvents.count)")
            SummaryRow(label: "Busy times", value: "\(config.busyTimes.count)")
        }
    }
}

struct SummaryRow: View {
    let label: String
    let value: String
    var body: some View {
        HStack {
            Text(label).font(PlFont.body()).foregroundStyle(.secondary)
            Spacer()
            Text(value).font(PlFont.body(.semibold))
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }
}

// MARK: - Reusable sub-components

struct StageProgressBar: View {
    let currentStage: GenerateScheduleView.Stage
    private let total = GenerateScheduleView.Stage.allCases.count

    var body: some View {
        VStack(spacing: PlSpacing.s2) {
            HStack {
                ForEach(GenerateScheduleView.Stage.allCases, id: \.rawValue) { stage in
                    Capsule()
                        .fill(stage.rawValue <= currentStage.rawValue
                              ? AnyShapeStyle(LinearGradient.plPurple)
                              : AnyShapeStyle(Color(.tertiarySystemBackground)))
                        .frame(height: 4)
                }
            }
            HStack {
                Text(currentStage.title)
                    .font(PlFont.caption(.semibold))
                    .foregroundStyle(.plGradientStart)
                Spacer()
                Text("Step \(currentStage.rawValue + 1) of \(total)")
                    .font(PlFont.caption())
                    .foregroundStyle(.secondary)
            }
        }
    }
}

struct StageSectionHeader: View {
    let icon: String
    let title: String
    let subtitle: String

    var body: some View {
        HStack(alignment: .top, spacing: PlSpacing.s3) {
            ZStack {
                RoundedRectangle(cornerRadius: 10)
                    .fill(LinearGradient.plPurple)
                    .frame(width: 40, height: 40)
                Image(systemName: icon)
                    .font(.system(size: 18, weight: .semibold))
                    .foregroundStyle(.white)
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(title).font(PlFont.subHeading(.semibold))
                Text(subtitle).font(PlFont.caption()).foregroundStyle(.secondary)
            }
        }
    }
}

struct StepperField: View {
    let label: String
    @Binding var value: Int
    let range: ClosedRange<Int>
    var step: Int = 1

    var body: some View {
        HStack {
            Text(label).font(PlFont.body()).foregroundStyle(.secondary)
            Spacer()
            HStack(spacing: PlSpacing.s2) {
                Button { value = max(range.lowerBound, value - step) }
                    label: { Image(systemName: "minus.circle").font(.system(size: 20)) }
                    .foregroundStyle(.plGradientStart)
                Text("\(value)").font(PlFont.body(.semibold)).frame(minWidth: 36, alignment: .center)
                Button { value = min(range.upperBound, value + step) }
                    label: { Image(systemName: "plus.circle").font(.system(size: 20)) }
                    .foregroundStyle(.plGradientStart)
            }
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

struct StrategyPill: View {
    let strategy: SchedulingStrategy
    let isSelected: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            HStack(spacing: PlSpacing.s3) {
                Image(systemName: strategy.icon)
                    .font(.system(size: 16))
                    .foregroundStyle(isSelected ? .white : .plGradientStart)
                    .frame(width: 24)
                VStack(alignment: .leading, spacing: 2) {
                    Text(strategy.displayName)
                        .font(PlFont.body(.semibold))
                        .foregroundStyle(isSelected ? .white : .primary)
                    Text(strategy.description)
                        .font(PlFont.caption())
                        .foregroundStyle(isSelected ? .white.opacity(0.8) : .secondary)
                        .lineLimit(2)
                }
            }
            .padding()
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(isSelected ? AnyShapeStyle(LinearGradient.plPurple) : AnyShapeStyle(Color(.secondarySystemBackground)))
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(isSelected ? Color.clear : Color(.separator), lineWidth: 1)
            )
        }
    }
}
