import Foundation

// MARK: - Enums

enum ActivityType: String, CaseIterable, Codable, Identifiable {
    case personal     = "personal"
    case meeting      = "meeting"
    case work         = "work"
    case event        = "event"
    case education    = "education"
    case travel       = "travel"
    case recreational = "recreational"
    case errand       = "errand"
    case other        = "other"
    case breakTime    = "break"

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .breakTime: return "Break"
        default: return rawValue.capitalized
        }
    }

    var systemIcon: String {
        switch self {
        case .personal:      return "person.fill"
        case .meeting:       return "video.fill"
        case .work:          return "briefcase.fill"
        case .event:         return "star.fill"
        case .education:     return "book.fill"
        case .travel:        return "airplane"
        case .recreational:  return "sportscourt.fill"
        case .errand:        return "cart.fill"
        case .other:         return "ellipsis.circle.fill"
        case .breakTime:     return "cup.and.saucer.fill"
        }
    }
}

enum Priority: String, CaseIterable, Codable {
    case low    = "low"
    case medium = "medium"
    case high   = "high"

    var displayName: String { rawValue.capitalized }

    var sortOrder: Int {
        switch self {
        case .low: return 0; case .medium: return 1; case .high: return 2
        }
    }
}

enum SchedulingStrategy: String, CaseIterable, Codable {
    case earliestFit       = "earliest-fit"
    case balancedWork      = "balanced-work"
    case deadlineOriented  = "deadline-oriented"

    var displayName: String {
        switch self {
        case .earliestFit:      return "Get it done early"
        case .balancedWork:     return "Spread it out evenly"
        case .deadlineOriented: return "Leave it to the deadlines"
        }
    }

    var icon: String {
        switch self {
        case .earliestFit:      return "bolt.fill"
        case .balancedWork:     return "scale.3d"
        case .deadlineOriented: return "exclamationmark.triangle.fill"
        }
    }

    var description: String {
        switch self {
        case .earliestFit:
            return "Tasks are scheduled as early as possible in the day."
        case .balancedWork:
            return "Tasks are evenly distributed throughout your working hours."
        case .deadlineOriented:
            return "Tasks are scheduled close to their deadlines."
        }
    }
}

// MARK: - Time24
// Mirrors the JS Time24 class. Stores time as an integer e.g. 930 = 9:30 AM.

struct Time24: Codable, Equatable, Comparable {
    let value: Int   // e.g. 900 = 9:00, 1430 = 14:30

    init(_ value: Int) {
        self.value = value
    }

    var hours: Int   { value / 100 }
    var minutes: Int { value % 100 }

    // "9:30 AM" style
    var display12: String {
        let suffix = hours < 12 ? "AM" : "PM"
        let h = hours == 0 ? 12 : (hours > 12 ? hours - 12 : hours)
        return String(format: "%d:%02d %@", h, minutes, suffix)
    }

    // "09:30" style
    var display24: String {
        String(format: "%02d:%02d", hours, minutes)
    }

    var totalMinutes: Int { hours * 60 + minutes }

    func adding(minutes m: Int) -> Time24 {
        let total = totalMinutes + m
        return Time24((total / 60) * 100 + (total % 60))
    }

    static func < (lhs: Time24, rhs: Time24) -> Bool {
        lhs.totalMinutes < rhs.totalMinutes
    }

    static func from(totalMinutes: Int) -> Time24 {
        Time24((totalMinutes / 60) * 100 + (totalMinutes % 60))
    }
}

// MARK: - ScheduleDate

struct ScheduleDate: Codable, Equatable, Hashable {
    let day: Int
    let month: Int
    let year: Int

    init(day: Int, month: Int, year: Int) {
        self.day = day; self.month = month; self.year = year
    }

    init(from date: Date = Date()) {
        let cal = Calendar.current
        day   = cal.component(.day,   from: date)
        month = cal.component(.month, from: date)
        year  = cal.component(.year,  from: date)
    }

    // "dd-mm-yyyy"
    var id: String { String(format: "%02d-%02d-%04d", day, month, year) }

    // "yyyy-mm-dd" for backend
    var backendId: String { String(format: "%04d-%02d-%02d", year, month, day) }

    var date: Date {
        var c = DateComponents()
        c.day = day; c.month = month; c.year = year
        return Calendar.current.date(from: c) ?? Date()
    }

    var displayString: String {
        let fmt = DateFormatter()
        fmt.dateFormat = "MMMM d, yyyy"
        return fmt.string(from: date)
    }

    var shortDisplay: String {
        let fmt = DateFormatter()
        fmt.dateFormat = "EEE d"
        return fmt.string(from: date)
    }

    func advanced(by days: Int) -> ScheduleDate {
        let newDate = Calendar.current.date(byAdding: .day, value: days, to: date) ?? date
        return ScheduleDate(from: newDate)
    }
}

// MARK: - TimeBlock

struct TimeBlock: Identifiable, Codable, Equatable {
    let id: UUID
    var name: String
    var blockType: BlockType
    var date: ScheduleDate
    var startTime: Time24
    var endTime: Time24
    var activityType: ActivityType
    var priority: Priority?
    var deadline: ScheduleDate?
    var isCompleted: Bool
    var backendId: String?

    enum BlockType: String, Codable {
        case rigid, flexible, breakBlock = "break"
    }

    init(
        id: UUID = UUID(),
        name: String,
        blockType: BlockType,
        date: ScheduleDate,
        startTime: Time24,
        endTime: Time24,
        activityType: ActivityType = .work,
        priority: Priority? = nil,
        deadline: ScheduleDate? = nil,
        isCompleted: Bool = false,
        backendId: String? = nil
    ) {
        self.id           = id
        self.name         = name
        self.blockType    = blockType
        self.date         = date
        self.startTime    = startTime
        self.endTime      = endTime
        self.activityType = activityType
        self.priority     = priority
        self.deadline     = deadline
        self.isCompleted  = isCompleted
        self.backendId    = backendId
    }

    var durationMinutes: Int {
        endTime.totalMinutes - startTime.totalMinutes
    }

    var timeRangeDisplay: String {
        "\(startTime.display12) – \(endTime.display12)"
    }
}

// MARK: - Day

struct Day: Identifiable, Codable {
    var id: UUID = UUID()
    var date: ScheduleDate
    var blocks: [TimeBlock]

    init(date: ScheduleDate, blocks: [TimeBlock] = []) {
        self.date = date; self.blocks = blocks
    }

    var sortedBlocks: [TimeBlock] {
        blocks.sorted { $0.startTime < $1.startTime }
    }

    var completedCount: Int  { blocks.filter { $0.isCompleted }.count }
    var totalTaskCount: Int  { blocks.filter { $0.blockType != .breakBlock }.count }
    var completionRate: Double {
        guard totalTaskCount > 0 else { return 0 }
        return Double(completedCount) / Double(totalTaskCount)
    }
}

// MARK: - Schedule

struct Schedule: Identifiable, Codable {
    var id: UUID = UUID()
    var backendId: String?
    var name: String
    var strategy: SchedulingStrategy
    var startDate: ScheduleDate
    var days: [ScheduleDate: Day]

    init(name: String, strategy: SchedulingStrategy, startDate: ScheduleDate, days: [ScheduleDate: Day] = [:]) {
        self.name      = name
        self.strategy  = strategy
        self.startDate = startDate
        self.days      = days
    }

    var sortedDates: [ScheduleDate] {
        days.keys.sorted { $0.date < $1.date }
    }

    var allBlocks: [TimeBlock] {
        days.values.flatMap { $0.blocks }
    }

    var totalTasks: Int    { allBlocks.filter { $0.blockType != .breakBlock }.count }
    var completedTasks: Int { allBlocks.filter { $0.isCompleted }.count }
    var completionRate: Double {
        guard totalTasks > 0 else { return 0 }
        return Double(completedTasks) / Double(totalTasks)
    }
}

// MARK: - Flexible event (used in schedule generation)

struct FlexibleEvent: Identifiable, Codable {
    var id: UUID = UUID()
    var name: String
    var duration: Int       // minutes
    var priority: Priority
    var activityType: ActivityType
    var deadline: ScheduleDate?
}

// MARK: - Rigid event (used in schedule generation)

struct RigidEvent: Identifiable, Codable {
    var id: UUID = UUID()
    var name: String
    var duration: Int
    var activityType: ActivityType
    var date: ScheduleDate
    var startTime: Time24
}

// MARK: - Break slot

struct BreakSlot: Identifiable, Codable {
    var id: UUID = UUID()
    var startTime: Time24
    var endTime: Time24
    var duration: Int { endTime.totalMinutes - startTime.totalMinutes }
}

// MARK: - User Profile

struct UserProfile: Codable {
    var displayName: String
    var email: String
    var avatarName: String
    var preferredStrategy: SchedulingStrategy
    var taskRemindersEnabled: Bool
    var dailyWorkingHoursLimit: Double
    var minGapBetweenEvents: Int     // minutes
    var isPro: Bool

    static var preview: UserProfile {
        UserProfile(
            displayName: "Shaurya",
            email: "shaurya@example.com",
            avatarName: "avatar1",
            preferredStrategy: .balancedWork,
            taskRemindersEnabled: true,
            dailyWorkingHoursLimit: 8,
            minGapBetweenEvents: 15,
            isPro: false
        )
    }
}

// MARK: - Chat

struct ChatMessage: Identifiable, Codable {
    var id: UUID = UUID()
    var role: Role
    var content: String
    var timestamp: Date = Date()

    enum Role: String, Codable { case user, assistant }
}

struct Chat: Identifiable, Codable {
    var id: UUID = UUID()
    var title: String
    var messages: [ChatMessage]
    var createdAt: Date = Date()
}
