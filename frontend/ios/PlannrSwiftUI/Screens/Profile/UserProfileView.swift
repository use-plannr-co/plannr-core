import SwiftUI

// MARK: - UserProfileView
// Mirrors UserProfileScreen.jsx — settings, preferences, navigation to sub-screens.

struct UserProfileView: View {
    @EnvironmentObject var appState: AppState
    @State private var showSignOutAlert = false
    @State private var showDeleteAlert = false

    var body: some View {
        List {

            // Avatar + name header
            Section {
                HStack(spacing: PlSpacing.s4) {
                    AvatarView(name: appState.userProfile.avatarName, size: 64)
                    VStack(alignment: .leading, spacing: 4) {
                        Text(appState.userProfile.displayName)
                            .font(PlFont.heading(.semibold))
                        Text(appState.userProfile.email)
                            .font(PlFont.body())
                            .foregroundStyle(.secondary)
                    }
                    Spacer()
                }
                .padding(.vertical, PlSpacing.s2)
            }

            // Appearance
            Section("Appearance") {
                Toggle(isOn: $appState.isDarkMode) {
                    Label("Dark Mode", systemImage: "moon.fill")
                }
                .tint(.plGradientStart)
            }

            // Scheduling defaults
            Section("Scheduling") {
                Picker(selection: $appState.userProfile.preferredStrategy) {
                    ForEach(SchedulingStrategy.allCases, id: \.rawValue) { s in
                        Text(s.displayName).tag(s)
                    }
                } label: {
                    Label("Default Strategy", systemImage: "slider.horizontal.3")
                }

                HStack {
                    Label("Working Hours Limit", systemImage: "clock")
                    Spacer()
                    Stepper("\(Int(appState.userProfile.dailyWorkingHoursLimit))h",
                            value: $appState.userProfile.dailyWorkingHoursLimit,
                            in: 1...16, step: 0.5)
                        .fixedSize()
                }

                HStack {
                    Label("Min Gap", systemImage: "timer")
                    Spacer()
                    Stepper("\(appState.userProfile.minGapBetweenEvents) min",
                            value: $appState.userProfile.minGapBetweenEvents,
                            in: 0...60, step: 5)
                        .fixedSize()
                }
            }

            // Notifications
            Section("Notifications") {
                Toggle(isOn: $appState.userProfile.taskRemindersEnabled) {
                    Label("Task Reminders", systemImage: "bell.fill")
                }
                .tint(.plGradientStart)
            }

            // Pro
            Section("Subscription") {
                if appState.isPro {
                    HStack {
                        Label("Plannr Pro", systemImage: "crown.fill")
                            .foregroundStyle(.plGradientStart)
                        Spacer()
                        Text("Active")
                            .font(PlFont.caption(.semibold))
                            .foregroundStyle(.plGreen)
                    }
                } else {
                    NavigationLink(destination: ProPaywallView()) {
                        Label("Upgrade to Pro", systemImage: "crown.fill")
                            .foregroundStyle(.plGradientStart)
                    }
                }
            }

            // Account navigation
            Section("Account") {
                NavigationLink(destination: ManageAccountView()) {
                    Label("Manage Account", systemImage: "person.crop.circle")
                }
                NavigationLink(destination: SavedSchedulesView()) {
                    Label("Saved Schedules", systemImage: "calendar")
                }
                NavigationLink(destination: ProductivityAnalyticsView()) {
                    Label("Productivity Analytics", systemImage: "chart.bar.fill")
                }
            }

            // Danger zone
            Section {
                Button(role: .destructive, action: { showSignOutAlert = true }) {
                    Label("Sign Out", systemImage: "arrow.right.square")
                }
                Button(role: .destructive, action: { showDeleteAlert = true }) {
                    Label("Delete Account", systemImage: "trash")
                }
            }
        }
        .navigationTitle("Profile")
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

// MARK: - Avatar view

struct AvatarView: View {
    let name: String
    let size: CGFloat

    // Maps the avatarName string to a system SF Symbol (real app would use image assets)
    private var symbolName: String {
        let table: [String: String] = [
            "avatar1": "person.fill",
            "avatar2": "person.crop.circle.fill",
            "avatar3": "person.circle.fill",
            "avatar4": "person.badge.clock.fill",
            "avatar5": "figure.wave",
            "avatar6": "figure.run",
        ]
        return table[name] ?? "person.fill"
    }

    var body: some View {
        ZStack {
            Circle()
                .fill(LinearGradient.plPurple)
                .frame(width: size, height: size)
            Image(systemName: symbolName)
                .font(.system(size: size * 0.4))
                .foregroundStyle(.white)
        }
    }
}
