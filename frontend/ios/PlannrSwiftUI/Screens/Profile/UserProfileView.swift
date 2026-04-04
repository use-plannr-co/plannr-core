import SwiftUI

// MARK: - UserProfileView

struct UserProfileView: View {
    @EnvironmentObject var appState: AppState
    @State private var showSignOutAlert = false
    @State private var showDeleteAlert = false

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: 0) {

                // Title
                Text("Profile")
                    .font(PlFont.title())
                    .foregroundStyle(Color.plForeground)
                    .padding(.top, PlSpacing.s16)
                    .padding(.horizontal, PlSpacing.s4)
                    .padding(.bottom, PlSpacing.s5)

                // Avatar + name card
                HStack(spacing: PlSpacing.s4) {
                    PlannrAvatarView(name: appState.userProfile.avatarName, size: 64)
                    VStack(alignment: .leading, spacing: PlSpacing.s1) {
                        Text(appState.userProfile.displayName)
                            .font(PlFont.heading(.semibold))
                            .foregroundStyle(Color.plForeground)
                        Text(appState.userProfile.email)
                            .font(PlFont.body())
                            .foregroundStyle(Color.plForeground.opacity(0.5))
                    }
                    Spacer()
                }
                .padding(PlSpacing.s4)
                .background(Color.plComp)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .plShadow(radius: 12)
                .padding(.horizontal, PlSpacing.s4)
                .padding(.bottom, PlSpacing.s4)

                // Settings sections
                ProfileSection(title: "Appearance") {
                    ProfileToggleRow(icon: "moon.fill", label: "Dark Mode", isOn: $appState.isDarkMode)
                }

                ProfileSection(title: "Scheduling") {
                    VStack(spacing: 0) {
                        ProfilePickerRow(
                            icon: "slider.horizontal.3",
                            label: "Strategy",
                            selection: $appState.userProfile.preferredStrategy,
                            options: SchedulingStrategy.allCases,
                            display: { $0.displayName }
                        )
                        ProfileDivider()
                        ProfileStepperRow(
                            icon: "clock",
                            label: "Working Hours",
                            value: $appState.userProfile.dailyWorkingHoursLimit,
                            range: 1...16, step: 0.5,
                            format: { "\(Int($0))h" }
                        )
                        ProfileDivider()
                        ProfileIntStepperRow(
                            icon: "timer",
                            label: "Min Gap",
                            value: $appState.userProfile.minGapBetweenEvents,
                            range: 0...60, step: 5,
                            format: { "\($0) min" }
                        )
                    }
                }

                ProfileSection(title: "Notifications") {
                    ProfileToggleRow(icon: "bell.fill", label: "Task Reminders",
                                     isOn: $appState.userProfile.taskRemindersEnabled)
                }

                ProfileSection(title: "Subscription") {
                    if appState.isPro {
                        ProfileRow(icon: "crown.fill", label: "Plannr Pro", value: "Active",
                                   valueColor: Color.plGreen)
                    } else {
                        NavigationLink(destination: ProPaywallView()) {
                            ProfileRowContent(icon: "crown.fill", label: "Upgrade to Pro",
                                              iconColor: Color.plGradientStart)
                        }
                    }
                }

                ProfileSection(title: "Account") {
                    VStack(spacing: 0) {
                        NavigationLink(destination: ManageAccountView()) {
                            ProfileRowContent(icon: "person.crop.circle", label: "Manage Account")
                        }
                        ProfileDivider()
                        NavigationLink(destination: SavedSchedulesView()) {
                            ProfileRowContent(icon: "calendar", label: "Saved Schedules")
                        }
                        ProfileDivider()
                        NavigationLink(destination: ProductivityAnalyticsView()) {
                            ProfileRowContent(icon: "chart.bar.fill", label: "Productivity Analytics")
                        }
                    }
                }

                // Danger actions
                VStack(spacing: PlSpacing.s3) {
                    Button(action: { showSignOutAlert = true }) {
                        Text("Sign Out")
                            .font(PlFont.subHeading(.semibold))
                            .foregroundStyle(Color.plForeground)
                            .frame(maxWidth: .infinity)
                            .padding(PlSpacing.s4)
                            .background(Color.plComp)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                            .plShadow(radius: 6)
                    }
                    Button(action: { showDeleteAlert = true }) {
                        Text("Delete Account")
                            .font(PlFont.subHeading(.semibold))
                            .foregroundStyle(Color.plRed)
                            .frame(maxWidth: .infinity)
                            .padding(PlSpacing.s4)
                            .background(Color.plComp)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                            .plShadow(radius: 6)
                    }
                }
                .padding(.horizontal, PlSpacing.s4)
                .padding(.top, PlSpacing.s2)

                Spacer(minLength: 100)
            }
        }
        .background(Color.plBackground.ignoresSafeArea())
        .navigationBarHidden(true)
        .alert("Sign Out?", isPresented: $showSignOutAlert) {
            Button("Sign Out", role: .destructive) { appState.signOut() }
            Button("Cancel", role: .cancel) {}
        }
        .alert("Delete Account?", isPresented: $showDeleteAlert) {
            Button("Delete", role: .destructive) { appState.signOut() }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This is irreversible. All your data will be permanently deleted.")
        }
    }
}

// MARK: - Profile section container

struct ProfileSection<Content: View>: View {
    let title: String
    @ViewBuilder let content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: PlSpacing.s2) {
            Text(title)
                .font(PlFont.caption(.semibold))
                .foregroundStyle(Color.plForeground.opacity(0.4))
                .textCase(.uppercase)
                .padding(.horizontal, PlSpacing.s4)
            content()
                .background(Color.plComp)
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .plShadow(radius: 6)
                .padding(.horizontal, PlSpacing.s4)
        }
        .padding(.bottom, PlSpacing.s4)
    }
}

struct ProfileDivider: View {
    var body: some View {
        Rectangle()
            .fill(Color.plForeground.opacity(0.08))
            .frame(height: 1)
            .padding(.leading, PlSpacing.s4 + 24 + PlSpacing.s3)
    }
}

struct ProfileRowContent: View {
    let icon: String
    let label: String
    var iconColor: Color = Color.plForeground

    var body: some View {
        HStack(spacing: PlSpacing.s3) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundStyle(iconColor)
                .frame(width: 24)
            Text(label)
                .font(PlFont.subHeading())
                .foregroundStyle(Color.plForeground)
            Spacer()
            Image(systemName: "chevron.right")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(Color.plForeground.opacity(0.3))
        }
        .padding(.horizontal, PlSpacing.s4)
        .padding(.vertical, PlSpacing.s3)
    }
}

struct ProfileRow: View {
    let icon: String
    let label: String
    let value: String
    var valueColor: Color = Color.plForeground

    var body: some View {
        HStack(spacing: PlSpacing.s3) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundStyle(Color.plForeground)
                .frame(width: 24)
            Text(label)
                .font(PlFont.subHeading())
                .foregroundStyle(Color.plForeground)
            Spacer()
            Text(value)
                .font(PlFont.caption(.semibold))
                .foregroundStyle(valueColor)
        }
        .padding(.horizontal, PlSpacing.s4)
        .padding(.vertical, PlSpacing.s3)
    }
}

struct ProfileToggleRow: View {
    let icon: String
    let label: String
    @Binding var isOn: Bool

    var body: some View {
        HStack(spacing: PlSpacing.s3) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundStyle(Color.plForeground)
                .frame(width: 24)
            Text(label)
                .font(PlFont.subHeading())
                .foregroundStyle(Color.plForeground)
            Spacer()
            Toggle("", isOn: $isOn)
                .tint(Color.plGradientStart)
                .labelsHidden()
        }
        .padding(.horizontal, PlSpacing.s4)
        .padding(.vertical, PlSpacing.s3)
    }
}

struct ProfilePickerRow<T: Hashable>: View {
    let icon: String
    let label: String
    @Binding var selection: T
    let options: [T]
    let display: (T) -> String

    var body: some View {
        HStack(spacing: PlSpacing.s3) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundStyle(Color.plForeground)
                .frame(width: 24)
            Text(label)
                .font(PlFont.subHeading())
                .foregroundStyle(Color.plForeground)
            Spacer()
            Picker("", selection: $selection) {
                ForEach(options, id: \.self) { opt in
                    Text(display(opt)).tag(opt)
                }
            }
            .tint(Color.plGradientStart)
        }
        .padding(.horizontal, PlSpacing.s4)
        .padding(.vertical, PlSpacing.s3)
    }
}

struct ProfileStepperRow: View {
    let icon: String
    let label: String
    @Binding var value: Double
    let range: ClosedRange<Double>
    let step: Double
    let format: (Double) -> String

    var body: some View {
        HStack(spacing: PlSpacing.s3) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundStyle(Color.plForeground)
                .frame(width: 24)
            Text(label)
                .font(PlFont.subHeading())
                .foregroundStyle(Color.plForeground)
            Spacer()
            Stepper(format(value), value: $value, in: range, step: step)
                .labelsHidden()
            Text(format(value))
                .font(PlFont.caption(.semibold))
                .foregroundStyle(Color.plForeground)
                .frame(minWidth: 36, alignment: .trailing)
        }
        .padding(.horizontal, PlSpacing.s4)
        .padding(.vertical, PlSpacing.s3)
    }
}

struct ProfileIntStepperRow: View {
    let icon: String
    let label: String
    @Binding var value: Int
    let range: ClosedRange<Int>
    let step: Int
    let format: (Int) -> String

    var body: some View {
        HStack(spacing: PlSpacing.s3) {
            Image(systemName: icon)
                .font(.system(size: 16))
                .foregroundStyle(Color.plForeground)
                .frame(width: 24)
            Text(label)
                .font(PlFont.subHeading())
                .foregroundStyle(Color.plForeground)
            Spacer()
            Stepper("", value: $value, in: range, step: step).labelsHidden()
            Text(format(value))
                .font(PlFont.caption(.semibold))
                .foregroundStyle(Color.plForeground)
                .frame(minWidth: 48, alignment: .trailing)
        }
        .padding(.horizontal, PlSpacing.s4)
        .padding(.vertical, PlSpacing.s3)
    }
}

// MARK: - Avatar view

struct PlannrAvatarView: View {
    let name: String
    let size: CGFloat

    private var symbol: String {
        let table = ["avatar1": "person.fill", "avatar2": "person.crop.circle.fill",
                     "avatar3": "figure.wave", "avatar4": "figure.run",
                     "avatar5": "person.badge.clock.fill", "avatar6": "brain.head.profile"]
        return table[name] ?? "person.fill"
    }

    var body: some View {
        ZStack {
            Circle()
                .fill(LinearGradient.plPurple)
                .frame(width: size, height: size)
            Image(systemName: symbol)
                .font(.system(size: size * 0.38, weight: .semibold))
                .foregroundStyle(.white)
        }
    }
}
