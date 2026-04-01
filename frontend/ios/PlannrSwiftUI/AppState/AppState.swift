import SwiftUI
import Combine

// MARK: - AppState
// Central observable store — injected as an EnvironmentObject throughout the app.
// Mirrors the JS AppStateContext + SubscriptionContext + AppUpdateContext.

@MainActor
final class AppState: ObservableObject {

    // MARK: Auth / Onboarding
    @Published var isAuthenticated: Bool = false
    @Published var hasCompletedOnboarding: Bool = false
    @Published var isLoading: Bool = true

    // MARK: User
    @Published var userProfile: UserProfile = .preview
    @Published var isDarkMode: Bool = false
    var colorScheme: ColorScheme? { isDarkMode ? .dark : .light }

    // MARK: Schedules
    @Published var savedSchedules: [Schedule] = []
    @Published var activeSchedule: Schedule? = nil

    // MARK: Chat
    @Published var chats: [Chat] = []
    @Published var activeChat: Chat? = nil

    // MARK: Navigation
    @Published var selectedTab: Tab = .home

    enum Tab: Int, CaseIterable {
        case home, tasks, profile

        var title: String {
            switch self { case .home: return "Home"; case .tasks: return "Tasks"; case .profile: return "Profile" }
        }
        var icon: String {
            switch self { case .home: return "house.fill"; case .tasks: return "checkmark.square.fill"; case .profile: return "person.fill" }
        }
    }

    // MARK: Pro paywall
    @Published var isPro: Bool = false

    // MARK: Today's blocks
    var todaysBlocks: [TimeBlock] {
        guard let schedule = activeSchedule else { return [] }
        let today = ScheduleDate()
        return schedule.days[today]?.sortedBlocks ?? []
    }

    var todaysTasks: [TimeBlock] {
        todaysBlocks.filter { $0.blockType != .breakBlock }
    }

    var upcomingTasks: [TimeBlock] {
        let now = Time24(Calendar.current.component(.hour, from: Date()) * 100
                         + Calendar.current.component(.minute, from: Date()))
        return todaysTasks.filter { !$0.isCompleted && $0.startTime >= now }.prefix(3).map { $0 }
    }

    // MARK: - Simulated init
    init() {
        // Simulate async loading
        Task {
            try? await Task.sleep(nanoseconds: 1_500_000_000)
            await MainActor.run {
                isLoading = false
                isAuthenticated = true
                hasCompletedOnboarding = true
                seedDemoData()
            }
        }
    }

    // MARK: - Block completion toggle
    func toggleBlockCompletion(_ block: TimeBlock) {
        guard let schedIdx = savedSchedules.firstIndex(where: { $0.id == activeSchedule?.id }) else { return }
        let date = block.date
        if let blockIdx = savedSchedules[schedIdx].days[date]?.blocks.firstIndex(where: { $0.id == block.id }) {
            savedSchedules[schedIdx].days[date]?.blocks[blockIdx].isCompleted.toggle()
        }
        activeSchedule = savedSchedules[schedIdx]
    }

    // MARK: - Sign out / delete
    func signOut() {
        isAuthenticated = false
        hasCompletedOnboarding = false
        savedSchedules = []
        activeSchedule = nil
    }

    // MARK: - Demo data
    private func seedDemoData() {
        let today    = ScheduleDate()
        let tomorrow = today.advanced(by: 1)
        let day2     = today.advanced(by: 2)

        func block(_ name: String, _ start: Int, _ end: Int, _ type: ActivityType, bt: TimeBlock.BlockType = .flexible) -> TimeBlock {
            TimeBlock(name: name, blockType: bt, date: today,
                      startTime: Time24(start), endTime: Time24(end), activityType: type)
        }

        let day0 = Day(date: today, blocks: [
            block("Morning Standup",   900,  930, .meeting, bt: .rigid),
            block("Design Review",     1000, 1100, .work),
            block("Lunch Break",       1200, 1300, .breakTime, bt: .breakBlock),
            block("Build Auth Module", 1300, 1500, .work),
            block("Code Review",       1500, 1600, .meeting),
            block("Exercise",          1700, 1800, .recreational),
        ])
        let day1 = Day(date: tomorrow, blocks: [
            block("Sprint Planning",   930,  1030, .meeting, bt: .rigid),
            block("Write Tests",       1100, 1300, .work),
        ])
        let day2v = Day(date: day2, blocks: [
            block("Client Call",       1400, 1500, .meeting, bt: .rigid),
        ])

        var schedule = Schedule(
            name: "Work Week",
            strategy: .balancedWork,
            startDate: today,
            days: [today: day0, tomorrow: day1, day2: day2v]
        )
        schedule.backendId = "demo-1"

        savedSchedules = [schedule]
        activeSchedule = schedule

        chats = [
            Chat(id: UUID(), title: "Today's overview", messages: [
                ChatMessage(role: .user,      content: "What's on my schedule today?"),
                ChatMessage(role: .assistant, content: "You have 5 tasks today! Starting with **Morning Standup** at 9:00 AM. Your busiest period is 1:00 PM – 4:00 PM with back-to-back work sessions."),
            ]),
        ]
        activeChat = chats.first
    }
}
