import SwiftUI

// MARK: - AuthFlow

struct AuthFlow: View {
    var body: some View {
        NavigationStack { SignInView() }
    }
}

// MARK: - SignInView

struct SignInView: View {
    @EnvironmentObject var appState: AppState
    @State private var email = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(spacing: 0) {

                // Wordmark
                VStack(spacing: PlSpacing.s2) {
                    Text("Plannr")
                        .font(PlFont.title())
                        .foregroundStyle(LinearGradient(
                            colors: [Color.plGradientStart, Color.plGradientEnd],
                            startPoint: .leading, endPoint: .trailing))
                    Text("Your AI scheduling assistant")
                        .font(PlFont.subHeading())
                        .foregroundStyle(Color.plForeground.opacity(0.5))
                }
                .padding(.top, PlSpacing.s16)
                .padding(.bottom, PlSpacing.s8)

                VStack(spacing: PlSpacing.s3) {
                    PlannrTextField(placeholder: "Email", text: $email,
                                    keyboardType: .emailAddress, autocap: false)
                    PlannrTextField(placeholder: "Password", text: $password,
                                    isSecure: true, autocap: false)
                }
                .padding(.bottom, PlSpacing.s3)

                if let err = errorMessage {
                    Text(err)
                        .font(PlFont.caption())
                        .foregroundStyle(Color.plRed)
                        .padding(.bottom, PlSpacing.s3)
                }

                GradientButton(title: isLoading ? "Signing in…" : "Sign In") { signIn() }
                    .disabled(isLoading || email.isEmpty || password.isEmpty)
                    .padding(.bottom, PlSpacing.s5)

                NavigationLink { SignUpView() } label: {
                    HStack(spacing: 4) {
                        Text("Don't have an account?")
                            .foregroundStyle(Color.plForeground.opacity(0.5))
                        Text("Sign up")
                            .foregroundStyle(Color.plGradientStart)
                    }
                    .font(PlFont.body())
                }
            }
            .padding(.horizontal, PlSpacing.s4)
        }
        .background(Color.plBackground.ignoresSafeArea())
        .navigationBarHidden(true)
    }

    private func signIn() {
        isLoading = true; errorMessage = nil
        Task {
            try? await Task.sleep(nanoseconds: 1_000_000_000)
            await MainActor.run {
                isLoading = false
                if email.contains("@") { appState.isAuthenticated = true }
                else { errorMessage = "Invalid email or password." }
            }
        }
    }
}

// MARK: - SignUpView

struct SignUpView: View {
    @EnvironmentObject var appState: AppState
    @State private var name = ""
    @State private var email = ""
    @State private var password = ""
    @State private var isLoading = false

    var body: some View {
        ScrollView(showsIndicators: false) {
            VStack(alignment: .leading, spacing: 0) {
                Text("Create account")
                    .font(PlFont.title())
                    .foregroundStyle(Color.plForeground)
                    .padding(.top, PlSpacing.s16)
                    .padding(.bottom, PlSpacing.s2)
                Text("Start scheduling smarter.")
                    .font(PlFont.subHeading())
                    .foregroundStyle(Color.plForeground.opacity(0.5))
                    .padding(.bottom, PlSpacing.s8)

                VStack(spacing: PlSpacing.s3) {
                    PlannrTextField(placeholder: "Display name", text: $name)
                    PlannrTextField(placeholder: "Email", text: $email,
                                    keyboardType: .emailAddress, autocap: false)
                    PlannrTextField(placeholder: "Password", text: $password,
                                    isSecure: true, autocap: false)
                }
                .padding(.bottom, PlSpacing.s5)

                GradientButton(title: isLoading ? "Creating…" : "Create Account") { signUp() }
                    .disabled(isLoading || name.isEmpty || email.isEmpty || password.isEmpty)
            }
            .padding(.horizontal, PlSpacing.s4)
        }
        .background(Color.plBackground.ignoresSafeArea())
        .navigationTitle("Sign Up")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func signUp() {
        isLoading = true
        Task {
            try? await Task.sleep(nanoseconds: 1_000_000_000)
            await MainActor.run {
                isLoading = false
                appState.userProfile.displayName = name
                appState.isAuthenticated = true
            }
        }
    }
}

// MARK: - Shared form components

struct PlannrTextField: View {
    let placeholder: String
    @Binding var text: String
    var keyboardType: UIKeyboardType = .default
    var isSecure: Bool = false
    var autocap: Bool = true

    var body: some View {
        Group {
            if isSecure {
                SecureField(placeholder, text: $text)
            } else {
                TextField(placeholder, text: $text)
                    .keyboardType(keyboardType)
                    .autocapitalization(autocap ? .sentences : .none)
            }
        }
        .font(PlFont.subHeading())
        .foregroundStyle(Color.plForeground)
        .padding(.horizontal, PlSpacing.s4)
        .padding(.vertical, PlSpacing.s3)
        .background(Color.plInput)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

/// Primary CTA — gradient fill, radius 12, minHeight 56, shadow 0.2
struct GradientButton: View {
    let title: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(PlFont.heading(.semibold))
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .frame(minHeight: 56)
                .background(LinearGradient.plPurple)
                .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .shadow(color: .black.opacity(0.2), radius: 6, x: 0, y: 0)
    }
}

/// Secondary / destructive button — plInput bg, radius 12
struct PlainButton: View {
    let title: String
    var isDestructive: Bool = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(title)
                .font(PlFont.subHeading(.semibold))
                .foregroundStyle(isDestructive ? Color.plRed : Color.plForeground)
                .frame(maxWidth: .infinity)
                .padding(PlSpacing.s4)
                .background(Color.plInput)
                .clipShape(RoundedRectangle(cornerRadius: 12))
        }
    }
}

// MARK: - Shared aliases & components used across multiple screens

/// Gradient CTA button — same as GradientButton, aliased for convenience.
typealias PlButton = GradientButton

/// Input field — same as PlannrTextField, aliased for convenience.
typealias PlTextField = PlannrTextField

/// Gradient circle avatar (6 preset icons keyed by avatar name).
struct AvatarView: View {
    let name: String
    let size: CGFloat

    private var symbol: String {
        let table = ["avatar1": "person.fill",
                     "avatar2": "person.crop.circle.fill",
                     "avatar3": "figure.wave",
                     "avatar4": "figure.run",
                     "avatar5": "person.badge.clock.fill",
                     "avatar6": "brain.head.profile"]
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
