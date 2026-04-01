import SwiftUI

// MARK: - Plannr Typography
// Mirrors frontend/src/design/typography.js
// Uses system fonts — replace .system(...) with custom font names once
// PinkSunset / AlbertSans are added to the asset catalog.

struct PlFont {

    // MARK: Sizes
    static let title:      CGFloat = 28
    static let heading:    CGFloat = 22
    static let subHeading: CGFloat = 18
    static let body:       CGFloat = 15
    static let caption:    CGFloat = 13
    static let small:      CGFloat = 11

    // MARK: Convenience modifiers
    static func title(_ weight: Font.Weight = .bold) -> Font {
        .system(size: title, weight: weight, design: .rounded)
    }
    static func heading(_ weight: Font.Weight = .semibold) -> Font {
        .system(size: heading, weight: weight, design: .rounded)
    }
    static func subHeading(_ weight: Font.Weight = .medium) -> Font {
        .system(size: subHeading, weight: weight)
    }
    static func body(_ weight: Font.Weight = .regular) -> Font {
        .system(size: body, weight: weight)
    }
    static func caption(_ weight: Font.Weight = .regular) -> Font {
        .system(size: caption, weight: weight)
    }
}

// MARK: - Spacing constants
// Mirrors frontend/src/design/spacing.js

struct PlSpacing {
    static let s0:  CGFloat = 0
    static let s1:  CGFloat = 4
    static let s2:  CGFloat = 8
    static let s3:  CGFloat = 12
    static let s4:  CGFloat = 16   // screen padding
    static let s5:  CGFloat = 20
    static let s6:  CGFloat = 24
    static let s7:  CGFloat = 28
    static let s8:  CGFloat = 32
    static let s10: CGFloat = 40
    static let s12: CGFloat = 48
    static let s16: CGFloat = 64
}
