import SwiftUI

// MARK: - OnboardingView
// Mirrors OnboardingScreen.jsx — 8-step animated wizard collecting:
// display name, scheduling strategy, notifications preference, avatar.

struct OnboardingView: View {
    @EnvironmentObject var appState: AppState
    @State private var step: Int = 0
    @State private var name: String = ""
    @State private var strategy: SchedulingStrategy = .balancedWork
    @State private var notificationsEnabled: Bool = true
    @State private var selectedAvatar: String = "avatar1"
    @State private var progressValue: CGFloat = 0

    private let totalSteps = 8

    var body: some View {
        ZStack {
            // Background gradient
            LinearGradient.plPurple
                .ignoresSafeArea()

            VStack(spacing: 0) {
                // Progress bar
                ProgressView(value: Double(step + 1), total: Double(totalSteps))
                    .tint(.white)
                    .padding(.horizontal, PlSpacing.s6)
                    .padding(.top, 60)

                // Step counter
                Text("Step \(step + 1) of \(totalSteps)")
                    .font(PlFont.caption())
                    .foregroundStyle(.white.opacity(0.7))
                    .padding(.top, PlSpacing.s2)

                Spacer()

                // Step content
                Group {
                    switch step {
                    case 0: Step0_Welcome(name: $name)
                    case 1: Step1_Info()
                    case 2: Step2_Strategy(strategy: $strategy)
                    case 3: Step3_StrategyConfirm(strategy: strategy)
                    case 4: Step4_Problem()
                    case 5: Step5_Notifications(enabled: $notificationsEnabled)
                    case 6: Step6_Progress()
                    case 7: Step7_Avatar(selected: $selectedAvatar)
                    default: EmptyView()
                    }
                }
                .transition(.asymmetric(
                    insertion: .move(edge: .trailing).combined(with: .opacity),
                    removal:   .move(edge: .leading).combined(with: .opacity)
                ))
                .id(step) // Forces SwiftUI to remount on step change (triggers transition)

                Spacer()

                // Navigation buttons
                HStack(spacing: PlSpacing.s3) {
                    if step > 0 {
                        Button("Back") {
                            withAnimation(.spring(response: 0.4)) { step -= 1 }
                        }
                        .foregroundStyle(.white.opacity(0.8))
                        .frame(width: 80)
                    }

                    Button(action: { advance() }) {
                        Text(step == totalSteps - 1 ? "Get Started!" : "Continue")
                            .font(PlFont.subHeading(.semibold))
                            .foregroundStyle(.plGradientStart)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(.white)
                            .clipShape(RoundedRectangle(cornerRadius: 14))
                    }
                    .disabled(step == 0 && name.trimmingCharacters(in: .whitespaces).isEmpty)
                }
                .padding(.horizontal, PlSpacing.s6)
                .padding(.bottom, 48)
            }
        }
    }

    private func advance() {
        if step < totalSteps - 1 {
            withAnimation(.spring(response: 0.4)) { step += 1 }
        } else {
            completeOnboarding()
        }
    }

    private func completeOnboarding() {
        appState.userProfile.displayName        = name.isEmpty ? "Friend" : name
        appState.userProfile.preferredStrategy  = strategy
        appState.userProfile.taskRemindersEnabled = notificationsEnabled
        appState.userProfile.avatarName         = selectedAvatar
        appState.hasCompletedOnboarding         = true
    }
}

// MARK: - Step views

struct Step0_Welcome: View {
    @Binding var name: String
    @FocusState private var focused: Bool

    var body: some View {
        VStack(spacing: PlSpacing.s6) {
            Text("Welcome to Plannr!")
                .font(PlFont.title(.black))
                .foregroundStyle(.white)
                .multilineTextAlignment(.center)

            Text("Let's start with your name.")
                .font(PlFont.body())
                .foregroundStyle(.white.opacity(0.8))

            TextField("Your name", text: $name)
                .focused($focused)
                .font(PlFont.heading())
                .padding()
                .background(.white.opacity(0.15))
                .clipShape(RoundedRectangle(cornerRadius: 14))
                .foregroundStyle(.white)
                .overlay(
                    RoundedRectangle(cornerRadius: 14)
                        .stroke(.white.opacity(0.4), lineWidth: 1)
                )
                .padding(.horizontal, PlSpacing.s6)
                .onAppear { focused = true }
        }
        .padding(.horizontal, PlSpacing.s4)
    }
}

struct Step1_Info: View {
    var body: some View {
        VStack(spacing: PlSpacing.s6) {
            Image(systemName: "brain.head.profile")
                .font(.system(size: 80))
                .foregroundStyle(.white)

            Text("Meet your AI Scheduler")
                .font(PlFont.title(.bold))
                .foregroundStyle(.white)
                .multilineTextAlignment(.center)

            Text("Plannr uses AI to intelligently schedule your tasks around your life — so you can focus on doing, not planning.")
                .font(PlFont.body())
                .foregroundStyle(.white.opacity(0.85))
                .multilineTextAlignment(.center)
                .padding(.horizontal, PlSpacing.s4)
        }
    }
}

struct Step2_Strategy: View {
    @Binding var strategy: SchedulingStrategy

    var body: some View {
        VStack(spacing: PlSpacing.s5) {
            Text("How do you like to work?")
                .font(PlFont.title(.bold))
                .foregroundStyle(.white)
                .multilineTextAlignment(.center)

            VStack(spacing: PlSpacing.s3) {
                ForEach(SchedulingStrategy.allCases, id: \.rawValue) { s in
                    Button(action: { strategy = s }) {
                        HStack(spacing: PlSpacing.s3) {
                            Image(systemName: s.icon)
                                .font(.system(size: 20))
                                .frame(width: 28)
                            Text(s.displayName)
                                .font(PlFont.body(.semibold))
                            Spacer()
                            if strategy == s {
                                Image(systemName: "checkmark.circle.fill")
                            }
                        }
                        .foregroundStyle(strategy == s ? .plGradientStart : Color.white)
                        .padding()
                        .background(strategy == s ? .white : .white.opacity(0.15))
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                    }
                }
            }
            .padding(.horizontal, PlSpacing.s4)
        }
    }
}

struct Step3_StrategyConfirm: View {
    let strategy: SchedulingStrategy

    var body: some View {
        VStack(spacing: PlSpacing.s5) {
            Image(systemName: strategy.icon)
                .font(.system(size: 64))
                .foregroundStyle(.white)

            Text("Great choice!")
                .font(PlFont.title(.bold))
                .foregroundStyle(.white)

            Text("\"\(strategy.displayName)\"")
                .font(PlFont.heading(.semibold))
                .foregroundStyle(.white.opacity(0.9))

            Text(strategy.description)
                .font(PlFont.body())
                .foregroundStyle(.white.opacity(0.8))
                .multilineTextAlignment(.center)
                .padding(.horizontal, PlSpacing.s6)
        }
    }
}

struct Step4_Problem: View {
    var body: some View {
        VStack(spacing: PlSpacing.s5) {
            Image(systemName: "calendar.badge.clock")
                .font(.system(size: 72))
                .foregroundStyle(.white)

            Text("Save 2 hours a day")
                .font(PlFont.title(.bold))
                .foregroundStyle(.white)

            Text("People spend an average of 2 hours a day just deciding what to do next. Plannr eliminates that completely.")
                .font(PlFont.body())
                .foregroundStyle(.white.opacity(0.85))
                .multilineTextAlignment(.center)
                .padding(.horizontal, PlSpacing.s4)
        }
    }
}

struct Step5_Notifications: View {
    @Binding var enabled: Bool

    var body: some View {
        VStack(spacing: PlSpacing.s5) {
            Image(systemName: "bell.badge.fill")
                .font(.system(size: 72))
                .foregroundStyle(.white)

            Text("Task reminders")
                .font(PlFont.title(.bold))
                .foregroundStyle(.white)

            Text("Get notified before each task starts so you never miss a beat.")
                .font(PlFont.body())
                .foregroundStyle(.white.opacity(0.85))
                .multilineTextAlignment(.center)
                .padding(.horizontal, PlSpacing.s4)

            HStack(spacing: PlSpacing.s4) {
                Button(action: { enabled = true }) {
                    Text("Yes please!")
                        .font(PlFont.body(.semibold))
                        .foregroundStyle(enabled ? .plGradientStart : Color.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(enabled ? .white : .white.opacity(0.15))
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                }
                Button(action: { enabled = false }) {
                    Text("Maybe later")
                        .font(PlFont.body(.semibold))
                        .foregroundStyle(!enabled ? .plGradientStart : Color.white)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(!enabled ? .white : .white.opacity(0.15))
                        .clipShape(RoundedRectangle(cornerRadius: 14))
                }
            }
            .padding(.horizontal, PlSpacing.s4)
        }
    }
}

struct Step6_Progress: View {
    @State private var progress: CGFloat = 0

    var body: some View {
        VStack(spacing: PlSpacing.s5) {
            // Animated circular progress ring
            ZStack {
                Circle()
                    .stroke(.white.opacity(0.2), lineWidth: 12)
                    .frame(width: 120, height: 120)

                Circle()
                    .trim(from: 0, to: progress)
                    .stroke(.white, style: StrokeStyle(lineWidth: 12, lineCap: .round))
                    .frame(width: 120, height: 120)
                    .rotationEffect(.degrees(-90))

                VStack(spacing: 2) {
                    Text("2X")
                        .font(.system(size: 28, weight: .black))
                        .foregroundStyle(.white)
                    Text("MORE")
                        .font(PlFont.caption(.bold))
                        .foregroundStyle(.white.opacity(0.8))
                }
            }
            .onAppear {
                withAnimation(.easeOut(duration: 1.5)) { progress = 1.0 }
            }

            Text("2x more productive")
                .font(PlFont.title(.bold))
                .foregroundStyle(.white)

            Text("Users of Plannr report completing twice as many tasks per day compared to before.")
                .font(PlFont.body())
                .foregroundStyle(.white.opacity(0.85))
                .multilineTextAlignment(.center)
                .padding(.horizontal, PlSpacing.s4)
        }
    }
}

struct Step7_Avatar: View {
    @Binding var selected: String

    private let avatars = ["avatar1", "avatar2", "avatar3", "avatar4", "avatar5", "avatar6"]
    private let columns = [GridItem(.adaptive(minimum: 80))]

    var body: some View {
        VStack(spacing: PlSpacing.s5) {
            Text("Pick your avatar")
                .font(PlFont.title(.bold))
                .foregroundStyle(.white)

            LazyVGrid(columns: columns, spacing: PlSpacing.s4) {
                ForEach(avatars, id: \.self) { avatar in
                    Button(action: { selected = avatar }) {
                        ZStack(alignment: .bottomTrailing) {
                            AvatarView(name: avatar, size: 72)
                                .overlay(
                                    Circle()
                                        .stroke(.white, lineWidth: selected == avatar ? 3 : 0)
                                )
                                .scaleEffect(selected == avatar ? 1.1 : 1)
                                .animation(.spring(response: 0.3), value: selected)

                            if selected == avatar {
                                Image(systemName: "checkmark.circle.fill")
                                    .font(.system(size: 20))
                                    .foregroundStyle(.plGradientStart)
                                    .background(Circle().fill(.white).frame(width: 18, height: 18))
                            }
                        }
                    }
                }
            }
            .padding(.horizontal, PlSpacing.s6)
        }
    }
}
