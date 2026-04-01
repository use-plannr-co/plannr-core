import SwiftUI

// MARK: - LoadingView
// Mirrors LoadingScreen.jsx — shown while AppState initialises.

struct LoadingView: View {
    @State private var rotation: Double = 0

    var body: some View {
        ZStack {
            Color(.systemBackground).ignoresSafeArea()

            VStack(spacing: PlSpacing.s6) {
                // Spinning gradient ring
                Circle()
                    .trim(from: 0.1, to: 0.9)
                    .stroke(
                        LinearGradient.plPurple,
                        style: StrokeStyle(lineWidth: 5, lineCap: .round)
                    )
                    .frame(width: 56, height: 56)
                    .rotationEffect(.degrees(rotation))
                    .onAppear {
                        withAnimation(.linear(duration: 1).repeatForever(autoreverses: false)) {
                            rotation = 360
                        }
                    }

                Text("Loading…")
                    .font(PlFont.body())
                    .foregroundStyle(.secondary)
            }
        }
    }
}
