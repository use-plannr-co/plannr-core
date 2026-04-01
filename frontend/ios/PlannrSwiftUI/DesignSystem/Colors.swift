import SwiftUI

// MARK: - Plannr Design System Colors
// Mirrors frontend/src/design/colors.js — supports both light and dark modes.

extension Color {

    // MARK: Semantic tokens (auto-switch with color scheme)

    static var plBackground: Color      { Color("Background") }
    static var plForeground: Color      { Color("Foreground") }
    static var plCard: Color            { Color("Card") }
    static var plAccent: Color          { Color("Accent") }
    static var plNavbar: Color          { Color("Navbar") }
    static var plButton: Color          { Color("Button") }
    static var plSelection: Color       { Color("Selection") }
    static var plSubText: Color         { Color("SubText") }
    static var plBorder: Color          { Color("Border") }

    // MARK: Fixed palette

    static let plGradientStart = Color(hex: "#856BD3")
    static let plGradientEnd   = Color(hex: "#B79FFF")
    static let plGreen         = Color(hex: "#00CC00")
    static let plRed           = Color(hex: "#FF0000")
    static let plOrange        = Color(hex: "#FF9000")

    // MARK: Activity type colors

    static func activityColor(for type: ActivityType) -> Color {
        switch type {
        case .personal:      return Color(hex: "#FF6B6B")
        case .meeting:       return Color(hex: "#4ECDC4")
        case .work:          return Color(hex: "#45B7D1")
        case .event:         return Color(hex: "#96CEB4")
        case .education:     return Color(hex: "#FFEAA7")
        case .travel:        return Color(hex: "#DDA0DD")
        case .recreational:  return Color(hex: "#98FB98")
        case .errand:        return Color(hex: "#F0E68C")
        case .other:         return Color(hex: "#D3D3D3")
        case .breakTime:     return Color(hex: "#A8D8EA")
        }
    }
}

// MARK: - ShapeStyle extensions
// Allows dot-shorthand like .plGradientStart in foregroundStyle(), fill(), etc.
// This is the same pattern Apple uses for Color.red / ShapeStyle.red.

extension ShapeStyle where Self == Color {
    static var plGradientStart: Color { Color(hex: "#856BD3") }
    static var plGradientEnd:   Color { Color(hex: "#B79FFF") }
    static var plGreen:         Color { Color(hex: "#00CC00") }
    static var plRed:           Color { Color(hex: "#FF0000") }
    static var plOrange:        Color { Color(hex: "#FF9000") }
}

// MARK: - Purple gradient shorthand

extension LinearGradient {
    static var plPurple: LinearGradient {
        LinearGradient(
            colors: [.plGradientStart, .plGradientEnd],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }
}

// MARK: - Hex initialiser

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let r, g, b: Double
        switch hex.count {
        case 6:
            r = Double((int >> 16) & 0xFF) / 255
            g = Double((int >> 8)  & 0xFF) / 255
            b = Double(int         & 0xFF) / 255
        default:
            r = 0; g = 0; b = 0
        }
        self.init(red: r, green: g, blue: b)
    }
}
