import SwiftUI

// MARK: - LoadingView
// Shown while AppState initialises. Gradient spinner + wordmark on plBackground.

struct LoadingView: View {
    @State private var rotation: Double = 0
    @State private var opacity: Double = 0

    var body: some View {
        ZStack {
            Color.plBackground.ignoresSafeArea()

            VStack(spacing: PlSpacing.s5) {
                // Wordmark
                Text("Plannr")
                    .font(PlFont.title())
                    .foregroundStyle(LinearGradient(
                        colors: [Color.plGradientStart, Color.plGradientEnd],
                        startPoint: .leading, endPoint: .trailing))

                // Spinning gradient arc
                Circle()
                    .trim(from: 0.08, to: 0.92)
                    .stroke(
                        AngularGradient(
                            colors: [Color.plGradientStart, Color.plGradientEnd, Color.plGradientStart],
                            center: .center
                        ),
                        style: StrokeStyle(lineWidth: 4, lineCap: .round)
                    )
                    .frame(width: 48, height: 48)
                    .rotationEffect(.degrees(rotation))
                    .onAppear {
                        withAnimation(.linear(duration: 0.9).repeatForever(autoreverses: false)) {
                            rotation = 360
                        }
                        withAnimation(.easeIn(duration: 0.4)) { opacity = 1 }
                    }
            }
            .opacity(opacity)
        }
    }
}
