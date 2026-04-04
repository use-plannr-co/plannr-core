import SwiftUI

// MARK: - ManageAccountView
// Mirrors ManageAccountScreen.jsx — edit display name + avatar.

struct ManageAccountView: View {
    @EnvironmentObject var appState: AppState
    @State private var draftName: String = ""
    @State private var showAvatarPicker = false
    @FocusState private var nameFocused: Bool

    private var isDirty: Bool { draftName != appState.userProfile.displayName }

    var body: some View {
        List {
            // Avatar
            Section {
                HStack {
                    Spacer()
                    Button(action: { showAvatarPicker = true }) {
                        ZStack(alignment: .bottomTrailing) {
                            AvatarView(name: appState.userProfile.avatarName, size: 90)
                            ZStack {
                                Circle()
                                    .fill(Color.plBackground)
                                    .frame(width: 28, height: 28)
                                Image(systemName: "pencil.circle.fill")
                                    .font(.system(size: 26))
                                    .foregroundStyle(.plGradientStart)
                            }
                        }
                    }
                    Spacer()
                }
                .padding(.vertical, PlSpacing.s2)
                .listRowBackground(Color.clear)
            }

            // Name
            Section("Display Name") {
                TextField("Your name", text: $draftName)
                    .focused($nameFocused)
            }

            // Email (read-only)
            Section("Email") {
                Text(appState.userProfile.email)
                    .foregroundStyle(Color.plForeground.opacity(0.5))
            }
        }
        .navigationTitle("Manage Account")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if isDirty {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Save") {
                        appState.userProfile.displayName = draftName
                        nameFocused = false
                    }
                    .fontWeight(.semibold)
                }
            }
        }
        .onAppear {
            draftName = appState.userProfile.displayName
        }
        .sheet(isPresented: $showAvatarPicker) {
            AvatarPickerSheet(selected: $appState.userProfile.avatarName)
                .presentationDetents([.medium])
        }
    }
}

// MARK: - Avatar picker sheet

struct AvatarPickerSheet: View {
    @Binding var selected: String
    @Environment(\.dismiss) var dismiss

    private let avatars = ["avatar1", "avatar2", "avatar3", "avatar4", "avatar5", "avatar6"]
    private let columns = [GridItem(.adaptive(minimum: 80))]

    var body: some View {
        NavigationStack {
            LazyVGrid(columns: columns, spacing: PlSpacing.s4) {
                ForEach(avatars, id: \.self) { avatar in
                    Button(action: {
                        selected = avatar
                        dismiss()
                    }) {
                        ZStack {
                            AvatarView(name: avatar, size: 72)
                            if selected == avatar {
                                Circle()
                                    .stroke(.plGradientStart, lineWidth: 3)
                                    .frame(width: 78, height: 78)
                                Circle()
                                    .fill(.plGradientStart)
                                    .frame(width: 22, height: 22)
                                    .overlay { Image(systemName: "checkmark").font(.system(size: 11, weight: .bold)).foregroundStyle(.white) }
                                    .offset(x: 26, y: -26)
                            }
                        }
                    }
                }
            }
            .padding(PlSpacing.s6)
            .navigationTitle("Pick Avatar")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) { Button("Done") { dismiss() } }
            }
        }
    }
}
