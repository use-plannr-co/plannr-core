import SwiftUI

// MARK: - Plannr Design System Colors
// Precisely mirrors frontend/src/design/colors.js

// MARK: - Adaptive color helper (no asset catalog needed)

extension UIColor {
    convenience init(light: UIColor, dark: UIColor) {
        self.init { $0.userInterfaceStyle == .dark ? dark : light }
    }
    convenience init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let r = CGFloat((int >> 16) & 0xFF) / 255
        let g = CGFloat((int >> 8)  & 0xFF) / 255
        let b = CGFloat(int         & 0xFF) / 255
        self.init(red: r, green: g, blue: b, alpha: 1)
    }
}

// MARK: - Theme-aware Color tokens

extension Color {

    // MARK: Semantic tokens — flip between light/dark automatically

    /// #FFFFFF / #222222
    static var plBackground: Color {
        Color(UIColor(light: UIColor(hex: "#FFFFFF"), dark: UIColor(hex: "#222222")))
    }
    /// Same as background in light (#FFFFFF) / #171717 in dark
    static var plComp: Color {
        Color(UIColor(light: UIColor(hex: "#FFFFFF"), dark: UIColor(hex: "#171717")))
    }
    /// #000000 / #FFFFFF
    static var plForeground: Color {
        Color(UIColor(light: UIColor(hex: "#000000"), dark: UIColor(hex: "#FFFFFF")))
    }
    /// Input field bg: #F0F0F0 / #2E2E2E
    static var plInput: Color {
        Color(UIColor(light: UIColor(hex: "#F0F0F0"), dark: UIColor(hex: "#2E2E2E")))
    }
    /// Nav bar bg: #000000 / #171717
    static var plNavbar: Color {
        Color(UIColor(light: UIColor(hex: "#000000"), dark: UIColor(hex: "#171717")))
    }

    // MARK: Fixed palette (same in both modes)

    static let plGradientStart = Color(hex: "#856BD3")
    static let plGradientEnd   = Color(hex: "#B79FFF")
    static let plGreen         = Color(hex: "#00CC00")
    static let plRed           = Color(hex: "#FF0000")
    static let plOrange        = Color(hex: "#FF9000")

    // MARK: Activity type colors — precise match to RN app

    static func activityColor(for type: ActivityType) -> Color {
        switch type {
        case .personal:      return Color(hex: "#2E86DE")   // blue
        case .meeting:       return Color(hex: "#48C9B0")   // teal
        case .work:          return Color(hex: "#27AE60")   // green
        case .event:         return Color(hex: "#E67E22")   // orange
        case .education:     return Color(hex: "#F39C12")   // amber
        case .travel:        return Color(hex: "#8E44AD")   // purple
        case .recreational:  return Color(hex: "#D35400")   // dark orange
        case .errand:        return Color(hex: "#C0392B")   // crimson
        case .other:         return Color(hex: "#7F8C8D")   // slate
        case .breakTime:     return Color(hex: "#95A5A6")   // light gray
        }
    }

    // MARK: Hex initialiser
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let r = Double((int >> 16) & 0xFF) / 255
        let g = Double((int >> 8)  & 0xFF) / 255
        let b = Double(int         & 0xFF) / 255
        self.init(red: r, green: g, blue: b)
    }
}

// MARK: - ShapeStyle extensions
// Enables .plGradientStart shorthand in foregroundStyle(), fill(), etc.

extension ShapeStyle where Self == Color {
    static var plGradientStart: Color { Color(hex: "#856BD3") }
    static var plGradientEnd:   Color { Color(hex: "#B79FFF") }
    static var plGreen:         Color { Color(hex: "#00CC00") }
    static var plRed:           Color { Color(hex: "#FF0000") }
    static var plOrange:        Color { Color(hex: "#FF9000") }
    static var plForeground:    Color { Color.plForeground }
    static var plBackground:    Color { Color.plBackground }
    static var plComp:          Color { Color.plComp }
    static var plInput:         Color { Color.plInput }
    static var plNavbar:        Color { Color.plNavbar }
}

// MARK: - Gradient shorthands

extension LinearGradient {
    /// The primary purple gradient used on buttons, badges, FAB, etc.
    static var plPurple: LinearGradient {
        LinearGradient(
            colors: [Color.plGradientStart, Color.plGradientEnd],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }
}

// MARK: - Plannr card shadow modifier
// Matches RN shadow: color #000, offset {0,0}, opacity 0.1, radius 12

struct PlCardShadow: ViewModifier {
    var radius: CGFloat = 12
    func body(content: Content) -> some View {
        content
            .shadow(color: Color.black.opacity(0.1), radius: radius, x: 0, y: 0)
    }
}

extension View {
    func plShadow(radius: CGFloat = 12) -> some View {
        modifier(PlCardShadow(radius: radius))
    }
}
