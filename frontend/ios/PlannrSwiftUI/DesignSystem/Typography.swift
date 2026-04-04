import SwiftUI

// MARK: - Plannr Typography
// Mirrors frontend/src/design/typography.js
//
// RN uses:
//   PinkSunset  → titles, big display text  (bold, stylised)
//   AlbertSans  → all body / UI text        (clean sans-serif)
//
// SwiftUI mapping:
//   PinkSunset  → .system(.rounded, weight: .black)  (closest feel)
//   AlbertSans  → .system(weight: *)                 (system SF)
//
// To use the real fonts: add PinkSunset.ttf and AlbertSans-*.ttf to the
// Xcode project, declare them in Info.plist under UIAppFonts, then
// replace Font.system(...) with Font.custom("PinkSunset", size: ...) etc.

// MARK: - Responsive sizes (mirrors RN breakpoints)

private var screenWidth: CGFloat { UIScreen.main.bounds.width }

struct PlFontSize {
    static var title:      CGFloat { screenWidth > 400 ? 32 : screenWidth > 350 ? 28 : 24 }
    static var heading:    CGFloat { screenWidth > 400 ? 20 : screenWidth > 350 ? 18 : 16 }
    static var subHeading: CGFloat { screenWidth > 400 ? 16 : screenWidth > 350 ? 14 : 12 }
    static var body:       CGFloat { screenWidth > 400 ? 14 : screenWidth > 350 ? 12 : 10 }
}

// MARK: - Font factory

struct PlFont {
    // PinkSunset equivalent — rounded black weight
    static func title(_ weight: Font.Weight = .black) -> Font {
        .system(size: PlFontSize.title, weight: weight, design: .rounded)
    }
    static func heading(_ weight: Font.Weight = .semibold) -> Font {
        .system(size: PlFontSize.heading, weight: weight)
    }
    static func subHeading(_ weight: Font.Weight = .medium) -> Font {
        .system(size: PlFontSize.subHeading, weight: weight)
    }
    static func body(_ weight: Font.Weight = .regular) -> Font {
        .system(size: PlFontSize.body, weight: weight)
    }
    static func caption(_ weight: Font.Weight = .regular) -> Font {
        .system(size: 12, weight: weight)
    }
    static func small(_ weight: Font.Weight = .regular) -> Font {
        .system(size: 10, weight: weight)
    }
}

// MARK: - Spacing constants
// Mirrors frontend/src/design/spacing.js exactly

struct PlSpacing {
    static let s0:  CGFloat = 0
    static let s1:  CGFloat = 4
    static let s2:  CGFloat = 8
    static let s3:  CGFloat = 12
    static let s4:  CGFloat = 16   // SCREEN_PADDING
    static let s5:  CGFloat = 20
    static let s6:  CGFloat = 24
    static let s7:  CGFloat = 28
    static let s8:  CGFloat = 32
    static let s9:  CGFloat = 36
    static let s10: CGFloat = 40
    static let s11: CGFloat = 44
    static let s12: CGFloat = 48
    static let s16: CGFloat = 64
}
