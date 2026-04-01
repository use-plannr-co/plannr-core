import SwiftUI

// MARK: - ChatView
// Mirrors ChatScreen.jsx — AI chat interface with streaming responses,
// chat history drawer, and suggestion pills.

struct ChatView: View {
    @EnvironmentObject var appState: AppState
    @Environment(\.dismiss) private var dismiss

    @State private var inputText = ""
    @State private var isStreaming = false
    @State private var showDrawer = false
    @State private var scrollProxy: ScrollViewProxy? = nil
    @State private var showJumpToLatest = false

    private let suggestions = [
        "What's on my schedule today?",
        "Am I running late?",
        "Add a task for me",
        "Reschedule my missed tasks",
    ]

    var body: some View {
        NavigationStack {
            ZStack {
                VStack(spacing: 0) {
                    // Chat messages
                    ScrollViewReader { proxy in
                        ScrollView {
                            LazyVStack(spacing: PlSpacing.s3) {
                                if let chat = appState.activeChat {
                                    if chat.messages.isEmpty {
                                        SuggestionPills(suggestions: suggestions) { s in
                                            sendMessage(s)
                                        }
                                        .padding(.top, 40)
                                    } else {
                                        ForEach(chat.messages) { msg in
                                            ChatBubble(message: msg)
                                                .id(msg.id)
                                        }
                                        if isStreaming {
                                            TypingIndicator()
                                        }
                                        // Scroll anchor
                                        Color.clear.frame(height: 1).id("bottom")
                                    }
                                } else {
                                    SuggestionPills(suggestions: suggestions) { s in
                                        sendMessage(s)
                                    }
                                    .padding(.top, 40)
                                }
                            }
                            .padding(.horizontal, PlSpacing.s4)
                            .padding(.vertical, PlSpacing.s4)
                        }
                        .onAppear { scrollProxy = proxy }
                        .onChange(of: appState.activeChat?.messages.count) { _ in
                            withAnimation { proxy.scrollTo("bottom") }
                        }
                    }

                    // Input bar
                    ChatInputBar(text: $inputText, isLoading: isStreaming) {
                        sendMessage(inputText)
                    }
                }

                // Jump to latest button
                if showJumpToLatest {
                    VStack {
                        Spacer()
                        HStack {
                            Spacer()
                            Button(action: {
                                withAnimation { scrollProxy?.scrollTo("bottom") }
                            }) {
                                Label("Jump to latest", systemImage: "arrow.down.circle.fill")
                                    .font(PlFont.caption(.semibold))
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 8)
                                    .background(.ultraThinMaterial)
                                    .clipShape(Capsule())
                            }
                            Spacer()
                        }
                        .padding(.bottom, 80)
                    }
                }
            }
            .navigationTitle(appState.activeChat?.title ?? "AI Assistant")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button(action: { showDrawer = true }) {
                        Image(systemName: "sidebar.left")
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button(action: { newChat() }) {
                        Image(systemName: "square.and.pencil")
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
            .sheet(isPresented: $showDrawer) {
                ChatDrawer(chats: appState.chats,
                           activeChat: appState.activeChat,
                           onSelect: { appState.activeChat = $0 },
                           onDelete: { chat in
                               appState.chats.removeAll { $0.id == chat.id }
                               if appState.activeChat?.id == chat.id {
                                   appState.activeChat = appState.chats.first
                               }
                           })
            }
        }
    }

    // MARK: - Actions

    private func sendMessage(_ text: String) {
        guard !text.trimmingCharacters(in: .whitespaces).isEmpty else { return }

        let userMsg = ChatMessage(role: .user, content: text)
        inputText = ""

        if appState.activeChat == nil {
            let newChat = Chat(id: UUID(), title: String(text.prefix(30)), messages: [])
            appState.chats.append(newChat)
            appState.activeChat = newChat
        }

        guard let idx = appState.chats.firstIndex(where: { $0.id == appState.activeChat?.id }) else { return }
        appState.chats[idx].messages.append(userMsg)
        appState.activeChat = appState.chats[idx]

        isStreaming = true

        // Simulate streaming AI response
        Task {
            try? await Task.sleep(nanoseconds: 1_500_000_000)
            await MainActor.run {
                let response = mockResponse(for: text)
                let assistantMsg = ChatMessage(role: .assistant, content: response)
                if let i = appState.chats.firstIndex(where: { $0.id == appState.activeChat?.id }) {
                    appState.chats[i].messages.append(assistantMsg)
                    appState.activeChat = appState.chats[i]
                }
                isStreaming = false
            }
        }
    }

    private func newChat() {
        let chat = Chat(id: UUID(), title: "New Chat", messages: [])
        appState.chats.append(chat)
        appState.activeChat = chat
    }

    private func mockResponse(for input: String) -> String {
        let input = input.lowercased()
        if input.contains("today") || input.contains("schedule") {
            return "You have **\(appState.todaysTasks.count)** tasks today. Your first task starts at \(appState.todaysTasks.first?.startTime.display12 ?? "—")."
        } else if input.contains("late") {
            let remaining = appState.todaysTasks.filter { !$0.isCompleted }
            return "You have **\(remaining.count)** incomplete tasks today. "
                + (remaining.isEmpty ? "You're all caught up! 🎉" : "Focus on **\(remaining.first?.name ?? "your next task")** first.")
        } else if input.contains("add") {
            return "I can add tasks to your schedule! Just describe what you need: name, duration, and priority. For example: \"Add a 30-minute code review, high priority.\""
        } else {
            return "I'm here to help you manage your schedule. Try asking about today's tasks, checking if you're behind, or asking me to add a new task!"
        }
    }
}

// MARK: - Chat bubble

struct ChatBubble: View {
    let message: ChatMessage

    var isUser: Bool { message.role == .user }

    var body: some View {
        HStack {
            if isUser { Spacer(minLength: 60) }

            VStack(alignment: isUser ? .trailing : .leading, spacing: 2) {
                Text(message.content)
                    .font(PlFont.body())
                    .foregroundStyle(isUser ? .white : .primary)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 10)
                    .background(
                        isUser
                        ? AnyShapeStyle(LinearGradient.plPurple)
                        : AnyShapeStyle(Color(.secondarySystemBackground))
                    )
                    .clipShape(BubbleShape(isUser: isUser))

                Text(timeString(message.timestamp))
                    .font(PlFont.caption())
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 4)
            }

            if !isUser { Spacer(minLength: 60) }
        }
    }

    private func timeString(_ date: Date) -> String {
        let f = DateFormatter(); f.timeStyle = .short
        return f.string(from: date)
    }
}

struct BubbleShape: Shape {
    let isUser: Bool

    func path(in rect: CGRect) -> Path {
        let r: CGFloat = 18
        let tailR: CGFloat = 6
        var p = Path()

        if isUser {
            p.addRoundedRect(in: rect.inset(by: UIEdgeInsets(top: 0, left: 0, bottom: 0, right: 0)),
                             cornerSize: CGSize(width: r, height: r))
        } else {
            p.addRoundedRect(in: rect, cornerSize: CGSize(width: r, height: r))
        }
        return p
    }
}

// MARK: - Suggestion pills

struct SuggestionPills: View {
    let suggestions: [String]
    let onTap: (String) -> Void

    var body: some View {
        VStack(spacing: PlSpacing.s4) {
            Image(systemName: "sparkles")
                .font(.system(size: 40))
                .foregroundStyle(.plGradientStart)

            Text("Ask me anything")
                .font(PlFont.heading(.semibold))

            Text("I can help you understand, manage, and optimise your schedule.")
                .font(PlFont.body())
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: PlSpacing.s3) {
                ForEach(suggestions, id: \.self) { suggestion in
                    Button(action: { onTap(suggestion) }) {
                        Text(suggestion)
                            .font(PlFont.caption(.medium))
                            .multilineTextAlignment(.center)
                            .padding()
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                            .background(Color(.secondarySystemBackground))
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                    }
                    .foregroundStyle(.primary)
                }
            }
        }
        .padding(.horizontal, PlSpacing.s4)
    }
}

// MARK: - Typing indicator

struct TypingIndicator: View {
    @State private var dots: [CGFloat] = [0, 0, 0]
    let timer = Timer.publish(every: 0.3, on: .main, in: .common).autoconnect()
    @State private var step = 0

    var body: some View {
        HStack(alignment: .bottom) {
            HStack(spacing: 4) {
                ForEach(0..<3) { i in
                    Circle()
                        .fill(Color.secondary)
                        .frame(width: 8, height: 8)
                        .offset(y: dots[i])
                }
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 12)
            .background(Color(.secondarySystemBackground))
            .clipShape(RoundedRectangle(cornerRadius: 18))
            Spacer()
        }
        .onReceive(timer) { _ in
            withAnimation(.spring(response: 0.3)) {
                dots = (0..<3).map { i in i == step % 3 ? -4 : 0 }
                step += 1
            }
        }
    }
}

// MARK: - Chat input bar

struct ChatInputBar: View {
    @Binding var text: String
    let isLoading: Bool
    let onSend: () -> Void

    var body: some View {
        HStack(spacing: PlSpacing.s3) {
            TextField("Message…", text: $text, axis: .vertical)
                .lineLimit(4)
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(Color(.secondarySystemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 22))

            Button(action: onSend) {
                ZStack {
                    Circle()
                        .fill(text.isEmpty ? AnyShapeStyle(Color(.tertiarySystemBackground)) : AnyShapeStyle(LinearGradient.plPurple))
                        .frame(width: 40, height: 40)
                    Image(systemName: isLoading ? "stop.fill" : "arrow.up")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(.white)
                }
            }
            .disabled(text.isEmpty && !isLoading)
        }
        .padding(.horizontal, PlSpacing.s4)
        .padding(.vertical, PlSpacing.s3)
        .background(.ultraThinMaterial)
        .overlay(alignment: .top) { Divider() }
    }
}

// MARK: - Chat drawer (history sidebar)

struct ChatDrawer: View {
    let chats: [Chat]
    let activeChat: Chat?
    let onSelect: (Chat) -> Void
    let onDelete: (Chat) -> Void
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                ForEach(chats) { chat in
                    Button(action: {
                        onSelect(chat)
                        dismiss()
                    }) {
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(chat.title)
                                    .font(PlFont.body(.semibold))
                                    .lineLimit(1)
                                Text("\(chat.messages.count) messages")
                                    .font(PlFont.caption())
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            if activeChat?.id == chat.id {
                                Image(systemName: "checkmark")
                                    .foregroundStyle(.plGradientStart)
                            }
                        }
                    }
                    .foregroundStyle(.primary)
                    .swipeActions {
                        Button("Delete", role: .destructive) { onDelete(chat) }
                    }
                }
            }
            .navigationTitle("Chat History")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) { Button("Done") { dismiss() } }
            }
        }
    }
}
