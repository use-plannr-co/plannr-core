import SwiftUI

// MARK: - ScheduleView
// Mirrors ScheduleViewScreen.jsx — timeline view of all days in a schedule.

struct ScheduleView: View {
    @EnvironmentObject var appState: AppState
    let schedule: Schedule

    @State private var selectedDate: ScheduleDate
    @State private var selectedBlock: TimeBlock? = nil
    @State private var showDeleteAlert = false
    @State private var showExportSheet = false

    init(schedule: Schedule) {
        self.schedule = schedule
        _selectedDate = State(initialValue: schedule.startDate)
    }

    private var sortedDates: [ScheduleDate] {
        schedule.days.keys.sorted { $0.date < $1.date }
    }

    private var selectedDay: Day? {
        schedule.days[selectedDate]
    }

    var body: some View {
        VStack(spacing: 0) {
            // Horizontal date strip
            DateStrip(dates: sortedDates, selectedDate: $selectedDate)

            Divider()

            // Timeline
            if let day = selectedDay {
                TimelineView(day: day, onBlockTap: { block in
                    selectedBlock = block
                })
            } else {
                EmptyDayView()
            }
        }
        .navigationTitle(schedule.name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Menu {
                    Button("Export to Calendar", systemImage: "calendar.badge.plus") {
                        showExportSheet = true
                    }
                    Button("Delete Schedule", systemImage: "trash", role: .destructive) {
                        showDeleteAlert = true
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
            }
        }
        .sheet(item: $selectedBlock) { block in
            EventInfoSheet(block: block)
                .presentationDetents([.medium])
        }
        .sheet(isPresented: $showExportSheet) {
            ExportCalendarSheet()
                .presentationDetents([.medium])
        }
        .alert("Delete \"\(schedule.name)\"?", isPresented: $showDeleteAlert) {
            Button("Delete", role: .destructive) {
                appState.savedSchedules.removeAll { $0.id == schedule.id }
                if appState.activeSchedule?.id == schedule.id {
                    appState.activeSchedule = appState.savedSchedules.first
                }
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This will permanently remove the schedule and all its tasks.")
        }
    }
}

// MARK: - Date strip

struct DateStrip: View {
    let dates: [ScheduleDate]
    @Binding var selectedDate: ScheduleDate
    @Namespace private var ns

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: PlSpacing.s3) {
                ForEach(dates, id: \.id) { date in
                    let isSelected = selectedDate == date
                    Button(action: {
                        withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                            selectedDate = date
                        }
                    }) {
                        VStack(spacing: 4) {
                            Text(dayOfWeek(date))
                                .font(.system(size: 11, weight: .medium))
                                .foregroundStyle(isSelected ? .white : .secondary)
                            Text("\(date.day)")
                                .font(.system(size: 17, weight: .bold))
                                .foregroundStyle(isSelected ? .white : .primary)
                        }
                        .frame(width: 44, height: 56)
                        .background {
                            if isSelected {
                                RoundedRectangle(cornerRadius: 14)
                                    .fill(LinearGradient.plPurple)
                                    .matchedGeometryEffect(id: "dateIndicator", in: ns)
                            }
                        }
                    }
                }
            }
            .padding(.horizontal, PlSpacing.s4)
            .padding(.vertical, PlSpacing.s3)
        }
    }

    private func dayOfWeek(_ d: ScheduleDate) -> String {
        let fmt = DateFormatter(); fmt.dateFormat = "EEE"
        return fmt.string(from: d.date)
    }
}

// MARK: - Timeline view (custom canvas-style layout)

struct TimelineView: View {
    let day: Day
    let onBlockTap: (TimeBlock) -> Void

    private let hourHeight: CGFloat = 60
    private let timeColumnWidth: CGFloat = 50
    private let startHour: Int = 6
    private let endHour: Int = 22

    private var visibleHours: [Int] { Array(startHour...endHour) }
    private var totalHeight: CGFloat { CGFloat(endHour - startHour) * hourHeight }

    var body: some View {
        ScrollView {
            ZStack(alignment: .topLeading) {

                // Hour grid lines + labels
                VStack(spacing: 0) {
                    ForEach(visibleHours, id: \.self) { hour in
                        HStack(spacing: 0) {
                            Text(hourLabel(hour))
                                .font(.system(size: 11))
                                .foregroundStyle(.secondary)
                                .frame(width: timeColumnWidth, alignment: .trailing)
                                .padding(.trailing, 8)
                            Divider()
                        }
                        .frame(height: hourHeight)
                    }
                }

                // Time blocks
                ForEach(day.sortedBlocks) { block in
                    let yOffset = yPosition(for: block.startTime)
                    let blockHeight = height(for: block)

                    if yOffset >= 0 {
                        TimeBlockCell(block: block, width: nil)
                            .frame(height: max(blockHeight, 30))
                            .padding(.leading, timeColumnWidth + PlSpacing.s2)
                            .padding(.trailing, PlSpacing.s4)
                            .offset(y: yOffset)
                            .onTapGesture { onBlockTap(block) }
                    }
                }
            }
            .frame(minHeight: totalHeight + hourHeight)
            .padding(.top, PlSpacing.s2)
            .padding(.bottom, 100)
        }
    }

    private func hourLabel(_ hour: Int) -> String {
        hour == 0 ? "12 AM" : hour < 12 ? "\(hour) AM" : hour == 12 ? "12 PM" : "\(hour - 12) PM"
    }

    private func yPosition(for time: Time24) -> CGFloat {
        let minutesFromStart = time.totalMinutes - startHour * 60
        return CGFloat(minutesFromStart) / 60 * hourHeight
    }

    private func height(for block: TimeBlock) -> CGFloat {
        CGFloat(block.durationMinutes) / 60 * hourHeight
    }
}

// MARK: - Time block cell

struct TimeBlockCell: View {
    let block: TimeBlock
    let width: CGFloat?
    @State private var isPressed = false

    var body: some View {
        HStack(spacing: 0) {
            // Color accent bar
            Rectangle()
                .fill(Color.activityColor(for: block.activityType))
                .frame(width: 4)

            VStack(alignment: .leading, spacing: 2) {
                Text(block.name)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(.primary)
                    .lineLimit(2)
                Text(block.timeRangeDisplay)
                    .font(.system(size: 11))
                    .foregroundStyle(.secondary)
            }
            .padding(.horizontal, 8)
            .padding(.vertical, 4)

            Spacer()
        }
        .background(Color.activityColor(for: block.activityType).opacity(0.12))
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(Color.activityColor(for: block.activityType).opacity(0.3), lineWidth: 1)
        )
        .scaleEffect(isPressed ? 0.97 : 1)
        .onLongPressGesture(minimumDuration: 0, pressing: { p in
            withAnimation(.spring(response: 0.2)) { isPressed = p }
        }, perform: {})
    }
}

// MARK: - Event info sheet

struct EventInfoSheet: View {
    let block: TimeBlock
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            VStack(spacing: PlSpacing.s5) {
                // Header
                ZStack {
                    LinearGradient.plPurple
                        .ignoresSafeArea(edges: .top)
                    HStack {
                        ZStack {
                            Circle()
                                .fill(.white.opacity(0.2))
                                .frame(width: 56, height: 56)
                            Image(systemName: block.activityType.systemIcon)
                                .font(.system(size: 22, weight: .semibold))
                                .foregroundStyle(.white)
                        }
                        VStack(alignment: .leading, spacing: 4) {
                            Text(block.name)
                                .font(PlFont.heading(.semibold))
                                .foregroundStyle(.white)
                            Text(block.activityType.displayName)
                                .font(PlFont.caption())
                                .foregroundStyle(.white.opacity(0.8))
                        }
                        Spacer()
                    }
                    .padding()
                }
                .frame(height: 110)

                // Detail rows
                VStack(spacing: PlSpacing.s3) {
                    InfoRow(icon: "clock.fill",         label: "Time",     value: block.timeRangeDisplay)
                    InfoRow(icon: "hourglass.fill",     label: "Duration",
                            value: "\(block.durationMinutes) min")
                    InfoRow(icon: "calendar",           label: "Date",     value: block.date.displayString)
                    if let p = block.priority {
                        InfoRow(icon: "flag.fill",      label: "Priority", value: p.displayName)
                    }
                    if let d = block.deadline {
                        InfoRow(icon: "alarm.fill",     label: "Deadline", value: d.displayString)
                    }
                }
                .padding(.horizontal, PlSpacing.s4)

                Spacer()
            }
            .navigationBarHidden(true)
            .overlay(alignment: .topTrailing) {
                Button(action: { dismiss() }) {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 28))
                        .foregroundStyle(.white)
                        .padding()
                }
            }
        }
    }
}

struct InfoRow: View {
    let icon: String
    let label: String
    let value: String

    var body: some View {
        HStack {
            Label(label, systemImage: icon)
                .font(PlFont.body())
                .foregroundStyle(.secondary)
            Spacer()
            Text(value)
                .font(PlFont.body(.semibold))
        }
        .padding()
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

// MARK: - Export sheet

struct ExportCalendarSheet: View {
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                Section {
                    Button(action: { /* Export to Apple Calendar via EventKit */ }) {
                        Label("Apple Calendar", systemImage: "calendar")
                    }
                    Button(action: { /* OAuth + Google Calendar API */ }) {
                        Label("Google Calendar", systemImage: "globe")
                    }
                } header: {
                    Text("Export to")
                }
            }
            .navigationTitle("Export Calendar")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) { Button("Done") { dismiss() } }
            }
        }
    }
}

// MARK: - Empty day

struct EmptyDayView: View {
    var body: some View {
        VStack(spacing: PlSpacing.s4) {
            Image(systemName: "calendar.badge.plus")
                .font(.system(size: 48))
                .foregroundStyle(.plGradientStart.opacity(0.5))
            Text("Nothing scheduled")
                .font(PlFont.heading())
            Text("No blocks for this day.")
                .font(PlFont.body())
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(.top, 80)
    }
}
