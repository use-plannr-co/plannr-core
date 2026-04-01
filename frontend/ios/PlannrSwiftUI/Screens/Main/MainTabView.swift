import SwiftUI

// MARK: - MainTabView
// Mirrors the AppStack bottom tab navigation with Home, Tasks, Profile tabs,
// plus a floating Chat button (FABChatButton equivalent).

struct MainTabView: View {
    @EnvironmentObject var appState: AppState
    @State private var showChat = false
    @State private var showGenerateSchedule = false
    @Namespace private var tabNamespace

    var body: some View {
        ZStack(alignment: .bottom) {

            // Tab content
            Group {
                switch appState.selectedTab {
                case .home:
                    NavigationStack { HomeView() }
                        .transition(.opacity)
                case .tasks:
                    NavigationStack { TodaysTasksView() }
                        .transition(.opacity)
                case .profile:
                    NavigationStack { UserProfileView() }
                        .transition(.opacity)
                }
            }
            .animation(.easeInOut(duration: 0.2), value: appState.selectedTab)

            // Custom nav bar + FAB
            VStack(spacing: 0) {
                Spacer()
                PlannrTabBar(selectedTab: $appState.selectedTab, showChat: $showChat)
            }
            .ignoresSafeArea(edges: .bottom)
        }
        .sheet(isPresented: $showChat) {
            ChatView()
        }
    }
}

// MARK: - Custom Tab Bar

struct PlannrTabBar: View {
    @Binding var selectedTab: AppState.Tab
    @Binding var showChat: Bool
    @Namespace private var ns

    var body: some View {
        HStack(spacing: 0) {
            ForEach(AppState.Tab.allCases, id: \.rawValue) { tab in
                // Insert FAB in the middle
                if tab == .tasks {
                    Spacer()
                    FABChatButton { showChat = true }
                    Spacer()
                }
                TabBarItem(tab: tab, isSelected: selectedTab == tab, namespace: ns) {
                    withAnimation(.spring(response: 0.35, dampingFraction: 0.7)) {
                        selectedTab = tab
                    }
                }
            }
        }
        .padding(.horizontal, PlSpacing.s4)
        .padding(.top, PlSpacing.s3)
        .padding(.bottom, 28)
        .background(.ultraThinMaterial)
        .overlay(alignment: .top) {
            Divider()
        }
    }
}

struct TabBarItem: View {
    let tab: AppState.Tab
    let isSelected: Bool
    let namespace: Namespace.ID
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(spacing: 4) {
                ZStack {
                    if isSelected {
                        RoundedRectangle(cornerRadius: 10)
                            .fill(.plGradientStart.opacity(0.15))
                            .frame(width: 44, height: 28)
                            .matchedGeometryEffect(id: "tabIndicator", in: namespace)
                    }
                    Image(systemName: tab.icon)
                        .font(.system(size: 18, weight: isSelected ? .semibold : .regular))
                        .foregroundStyle(isSelected ? .plGradientStart : Color.secondary)
                }
                Text(tab.title)
                    .font(.system(size: 10, weight: isSelected ? .semibold : .regular))
                    .foregroundStyle(isSelected ? .plGradientStart : Color.secondary)
            }
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Floating Action Button (Chat)

struct FABChatButton: View {
    let action: () -> Void
    @State private var scale: CGFloat = 1

    var body: some View {
        Button(action: action) {
            ZStack {
                LinearGradient.plPurple
                    .clipShape(Circle())
                    .frame(width: 56, height: 56)
                    .shadow(color: .plGradientEnd.opacity(0.5), radius: 8, y: 4)

                Image(systemName: "sparkles")
                    .font(.system(size: 22, weight: .semibold))
                    .foregroundStyle(.white)
            }
        }
        .scaleEffect(scale)
        .onLongPressGesture(minimumDuration: 0, pressing: { pressing in
            withAnimation(.spring(response: 0.3)) { scale = pressing ? 0.9 : 1 }
        }, perform: {})
        .offset(y: -10)
    }
}
