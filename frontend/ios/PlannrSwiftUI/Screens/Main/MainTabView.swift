import SwiftUI

// MARK: - MainTabView

struct MainTabView: View {
    @EnvironmentObject var appState: AppState
    @State private var showChat = false

    var body: some View {
        ZStack(alignment: .bottom) {
            // Tab content — full bleed, nav bar floats on top
            Group {
                switch appState.selectedTab {
                case .home:    NavigationStack { HomeView() }
                case .tasks:   NavigationStack { TodaysTasksView() }
                case .profile: NavigationStack { UserProfileView() }
                }
            }
            .animation(.easeInOut(duration: 0.2), value: appState.selectedTab)
            // Bottom padding so content isn't hidden behind the floating nav bar
            .safeAreaInset(edge: .bottom) { Color.clear.frame(height: 96) }

            // Floating nav bar
            PlannrNavBar(selectedTab: $appState.selectedTab, showChat: $showChat)
                .padding(.horizontal, PlSpacing.s4)
                .padding(.bottom, PlSpacing.s8)
        }
        .ignoresSafeArea(edges: .bottom)
        .sheet(isPresented: $showChat) { ChatView() }
    }
}

// MARK: - Nav bar
// Matches RN NavigationBar: black pill, white inactive icons,
// animated white square indicator behind the active icon.

struct PlannrNavBar: View {
    @Binding var selectedTab: AppState.Tab
    @Binding var showChat: Bool
    @Namespace private var ns

    // Heights mirroring RN BAR_HEIGHT breakpoints
    private var barHeight: CGFloat {
        UIScreen.main.bounds.width > 400 ? 64 : UIScreen.main.bounds.width > 380 ? 56 : 48
    }

    var body: some View {
        HStack(spacing: 0) {
            // Home
            NavBarItem(tab: .home, selectedTab: $selectedTab, namespace: ns)
            // Tasks
            NavBarItem(tab: .tasks, selectedTab: $selectedTab, namespace: ns)
            // FAB Chat — sits between Tasks and Profile
            FABChatButton { showChat = true }
                .frame(maxWidth: .infinity)
            // Profile
            NavBarItem(tab: .profile, selectedTab: $selectedTab, namespace: ns)
        }
        .frame(height: barHeight)
        .padding(.horizontal, PlSpacing.s2)
        .background(Color.plNavbar)
        .clipShape(Capsule())
        .shadow(color: .black.opacity(0.2), radius: 8, x: 0, y: 4)
    }
}

// MARK: - Nav bar item

struct NavBarItem: View {
    let tab: AppState.Tab
    @Binding var selectedTab: AppState.Tab
    let namespace: Namespace.ID

    private var isSelected: Bool { selectedTab == tab }

    var body: some View {
        Button {
            withAnimation(.spring(response: 0.35, dampingFraction: 0.7)) {
                selectedTab = tab
            }
        } label: {
            ZStack {
                // White pill indicator behind active icon
                if isSelected {
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color.white)
                        .frame(width: 48, height: 36)
                        .matchedGeometryEffect(id: "navIndicator", in: namespace)
                }
                Image(systemName: tab.icon)
                    .font(.system(size: 18, weight: .semibold))
                    // Active: black icon on white. Inactive: white icon on black.
                    .foregroundStyle(isSelected ? Color.black : Color.white)
            }
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - FAB Chat Button
// Gradient purple circle, floats slightly above the bar

struct FABChatButton: View {
    let action: () -> Void
    @State private var isPressed = false

    var body: some View {
        Button(action: action) {
            ZStack {
                Circle()
                    .fill(LinearGradient.plPurple)
                    .frame(width: 52, height: 52)
                    .shadow(color: Color.plGradientStart.opacity(0.5), radius: 8, x: 0, y: 4)
                Image(systemName: "sparkles")
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundStyle(.white)
            }
        }
        .offset(y: -12)
        .scaleEffect(isPressed ? 0.9 : 1)
        .onLongPressGesture(minimumDuration: 0, pressing: { pressing in
            withAnimation(.spring(response: 0.25)) { isPressed = pressing }
        }, perform: {})
    }
}
