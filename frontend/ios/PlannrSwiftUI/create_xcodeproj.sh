#!/usr/bin/env python3
"""
Generates a minimal PlannrSwiftUI.xcodeproj that Xcode 15+ can open.
Run: python3 create_xcodeproj.py
"""
import os, sys, uuid, pathlib, textwrap

# ── helpers ──────────────────────────────────────────────────────────────────

def uid():
    return uuid.uuid4().hex[:24].upper()

ROOT = pathlib.Path(__file__).parent.resolve()
PROJ = ROOT / "PlannrSwiftUI.xcodeproj"
PROJ.mkdir(exist_ok=True)

# ── collect all .swift files ──────────────────────────────────────────────────

swift_files = sorted(ROOT.rglob("*.swift"))
plist_file  = ROOT / "Info.plist"

# ── assign stable UUIDs keyed by relative path ───────────────────────────────

file_refs   = {}   # path → (fileRefUID, buildFileUID)
for f in swift_files:
    file_refs[f] = (uid(), uid())
plist_ref = (uid(), None)

# Top-level group UUID and children group UIDs
grp_root    = uid()   # main group
grp_sources = uid()   # Sources group

# Target + project UIDs
target_uid       = uid()
project_uid      = uid()
sources_phase    = uid()
resources_phase  = uid()
config_list_proj = uid()
config_list_tgt  = uid()
config_debug     = uid()
config_release   = uid()
tgt_debug        = uid()
tgt_release      = uid()
plist_fref       = uid()

BUNDLE_ID    = "com.sthareja19.PlannrSwiftUI"
DEPLOY_TGT   = "16.0"
PRODUCT_NAME = "PlannrSwiftUI"

# ── build sections ────────────────────────────────────────────────────────────

def pbx_file_references():
    lines = []
    for path, (fref, _) in file_refs.items():
        rel = path.relative_to(ROOT)
        lines.append(f'\t\t{fref} = {{isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = "{rel.name}"; sourceTree = "<group>"; }};')
    # Info.plist
    lines.append(f'\t\t{plist_fref} = {{isa = PBXFileReference; lastKnownFileType = text.plist.xml; path = Info.plist; sourceTree = "<group>"; }};')
    # Product
    global product_fref
    product_fref = uid()
    lines.append(f'\t\t{product_fref} = {{isa = PBXFileReference; explicitFileType = wrapper.application; includeInIndex = 0; path = {PRODUCT_NAME}.app; sourceTree = BUILT_PRODUCTS_DIR; }};')
    return "\n".join(lines)

product_fref = ""

def pbx_build_files():
    lines = []
    for path, (fref, bfuid) in file_refs.items():
        lines.append(f'\t\t{bfuid} = {{isa = PBXBuildFile; fileRef = {fref}; }};')
    return "\n".join(lines)

def pbx_group_children():
    """Flat list of fileRef UIDs for the main group."""
    children = [plist_fref]
    children += [fref for fref, _ in file_refs.values()]
    children.append(product_fref)
    return "\n".join(f"\t\t\t\t{c}," for c in children)

def pbx_sources_build_phase():
    files = "\n".join(f"\t\t\t\t{bfuid}," for _, (_, bfuid) in file_refs.items())
    return files

# ── assemble pbxproj ──────────────────────────────────────────────────────────

pbx_file_references()   # side-effect: sets product_fref

content = f"""// !$*UTF8*$!
{{
\tarchiveVersion = 1;
\tclasses = {{
\t}};
\tobjectVersion = 56;
\tobjects = {{

/* Begin PBXBuildFile section */
{pbx_build_files()}
/* End PBXBuildFile section */

/* Begin PBXFileReference section */
{pbx_file_references()}
/* End PBXFileReference section */

/* Begin PBXGroup section */
\t\t{grp_root} = {{
\t\t\tisa = PBXGroup;
\t\t\tchildren = (
{pbx_group_children()}
\t\t\t);
\t\t\tsourceTree = "<group>";
\t\t}};
/* End PBXGroup section */

/* Begin PBXNativeTarget section */
\t\t{target_uid} = {{
\t\t\tisa = PBXNativeTarget;
\t\t\tbuildConfigurationList = {config_list_tgt};
\t\t\tbuildPhases = (
\t\t\t\t{sources_phase},
\t\t\t\t{resources_phase},
\t\t\t);
\t\t\tbuildRules = ();
\t\t\tdependencies = ();
\t\t\tname = {PRODUCT_NAME};
\t\t\tproductName = {PRODUCT_NAME};
\t\t\tproductReference = {product_fref};
\t\t\tproductType = "com.apple.product-type.application";
\t\t}};
/* End PBXNativeTarget section */

/* Begin PBXProject section */
\t\t{project_uid} = {{
\t\t\tisa = PBXProject;
\t\t\tattributes = {{
\t\t\t\tBuildIndependentTargetsInParallel = 1;
\t\t\t\tLastSwiftUpdateCheck = 1500;
\t\t\t\tLastUpgradeCheck = 1500;
\t\t\t}};
\t\t\tbuildConfigurationList = {config_list_proj};
\t\t\tcompatibilityVersion = "Xcode 14.0";
\t\t\tdevelopmentRegion = en;
\t\t\thasScannedForEncodings = 0;
\t\t\tknownRegions = (en, Base);
\t\t\tmainGroup = {grp_root};
\t\t\tproductRefGroup = {grp_root};
\t\t\tprojectDirPath = "";
\t\t\tprojectRoot = "";
\t\t\ttargets = ({target_uid});
\t\t}};
/* End PBXProject section */

/* Begin PBXSourcesBuildPhase section */
\t\t{sources_phase} = {{
\t\t\tisa = PBXSourcesBuildPhase;
\t\t\tbuildActionMask = 2147483647;
\t\t\tfiles = (
{pbx_sources_build_phase()}
\t\t\t);
\t\t\trunOnlyForDeploymentPostprocessing = 0;
\t\t}};
/* End PBXSourcesBuildPhase section */

/* Begin PBXResourcesBuildPhase section */
\t\t{resources_phase} = {{
\t\t\tisa = PBXResourcesBuildPhase;
\t\t\tbuildActionMask = 2147483647;
\t\t\tfiles = ();
\t\t\trunOnlyForDeploymentPostprocessing = 0;
\t\t}};
/* End PBXResourcesBuildPhase section */

/* Begin XCBuildConfiguration section */
\t\t{config_debug} = {{
\t\t\tisa = XCBuildConfiguration;
\t\t\tbuildSettings = {{
\t\t\t\tALWAYS_SEARCH_USER_PATHS = NO;
\t\t\t\tCLANG_ANALYZER_NONNULL = YES;
\t\t\t\tCLANG_CXX_LANGUAGE_STANDARD = "gnu++20";
\t\t\t\tCOPY_PHASE_STRIP = NO;
\t\t\t\tDEBUG_INFORMATION_FORMAT = dwarf;
\t\t\t\tENABLE_STRICT_OBJC_MSGSEND = YES;
\t\t\t\tGCC_C_LANGUAGE_STANDARD = gnu17;
\t\t\t\tGCC_DYNAMIC_NO_PIC = NO;
\t\t\t\tGCC_OPTIMIZATION_LEVEL = 0;
\t\t\t\tGCC_PREPROCESSOR_DEFINITIONS = ("DEBUG=1", "$(inherited)");
\t\t\t\tIPHONEOS_DEPLOYMENT_TARGET = {DEPLOY_TGT};
\t\t\t\tMTL_ENABLE_DEBUG_INFO = INCLUDE_SOURCE;
\t\t\t\tMTL_FAST_MATH = YES;
\t\t\t\tONLY_ACTIVE_ARCH = YES;
\t\t\t\tSDKROOT = iphoneos;
\t\t\t\tSWIFT_ACTIVE_COMPILATION_CONDITIONS = DEBUG;
\t\t\t\tSWIFT_OPTIMIZATION_LEVEL = "-Onone";
\t\t\t}};
\t\t\tname = Debug;
\t\t}};
\t\t{config_release} = {{
\t\t\tisa = XCBuildConfiguration;
\t\t\tbuildSettings = {{
\t\t\t\tALWAYS_SEARCH_USER_PATHS = NO;
\t\t\t\tCLANG_ANALYZER_NONNULL = YES;
\t\t\t\tCLANG_CXX_LANGUAGE_STANDARD = "gnu++20";
\t\t\t\tCOPY_PHASE_STRIP = NO;
\t\t\t\tDEBUG_INFORMATION_FORMAT = "dwarf-with-dsym";
\t\t\t\tENABLE_NS_ASSERTIONS = NO;
\t\t\t\tENABLE_STRICT_OBJC_MSGSEND = YES;
\t\t\t\tGCC_C_LANGUAGE_STANDARD = gnu17;
\t\t\t\tGCC_NO_COMMON_BLOCKS = YES;
\t\t\t\tIPHONEOS_DEPLOYMENT_TARGET = {DEPLOY_TGT};
\t\t\t\tMTL_FAST_MATH = YES;
\t\t\t\tSDKROOT = iphoneos;
\t\t\t\tSWIFT_COMPILATION_MODE = wholemodule;
\t\t\t\tSWIFT_OPTIMIZATION_LEVEL = "-O";
\t\t\t\tVALIDATE_PRODUCT = YES;
\t\t\t}};
\t\t\tname = Release;
\t\t}};
\t\t{tgt_debug} = {{
\t\t\tisa = XCBuildConfiguration;
\t\t\tbuildSettings = {{
\t\t\t\tASSTCALOG_COMPILER_APPICON_NAME = AppIcon;
\t\t\t\tCODE_SIGN_STYLE = Automatic;
\t\t\t\tCURRENT_PROJECT_VERSION = 1;
\t\t\t\tGENERATE_INFOPLIST_FILE = NO;
\t\t\t\tINFOPLIST_FILE = Info.plist;
\t\t\t\tIPHONEOS_DEPLOYMENT_TARGET = {DEPLOY_TGT};
\t\t\t\tLE_SWIFT_VERSION = 5.0;
\t\t\t\tMARKETING_VERSION = 2.0.0;
\t\t\t\tPRODUCT_BUNDLE_IDENTIFIER = "{BUNDLE_ID}";
\t\t\t\tPRODUCT_NAME = "$(TARGET_NAME)";
\t\t\t\tSDKROOT = iphoneos;
\t\t\t\tSUPPORTED_PLATFORMS = "iphoneos iphonesimulator";
\t\t\t\tSWIFT_EMIT_LOC_STRINGS = YES;
\t\t\t\tSWIFT_VERSION = 5.0;
\t\t\t\tTARGETED_DEVICE_FAMILY = "1,2";
\t\t\t}};
\t\t\tname = Debug;
\t\t}};
\t\t{tgt_release} = {{
\t\t\tisa = XCBuildConfiguration;
\t\t\tbuildSettings = {{
\t\t\t\tASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;
\t\t\t\tCODE_SIGN_STYLE = Automatic;
\t\t\t\tCURRENT_PROJECT_VERSION = 1;
\t\t\t\tGENERATE_INFOPLIST_FILE = NO;
\t\t\t\tINFOPLIST_FILE = Info.plist;
\t\t\t\tIPHONEOS_DEPLOYMENT_TARGET = {DEPLOY_TGT};
\t\t\t\tLE_SWIFT_VERSION = 5.0;
\t\t\t\tMARKETING_VERSION = 2.0.0;
\t\t\t\tPRODUCT_BUNDLE_IDENTIFIER = "{BUNDLE_ID}";
\t\t\t\tPRODUCT_NAME = "$(TARGET_NAME)";
\t\t\t\tSDKROOT = iphoneos;
\t\t\t\tSUPPORTED_PLATFORMS = "iphoneos iphonesimulator";
\t\t\t\tSWIFT_EMIT_LOC_STRINGS = YES;
\t\t\t\tSWIFT_VERSION = 5.0;
\t\t\t\tTARGETED_DEVICE_FAMILY = "1,2";
\t\t\t}};
\t\t\tname = Release;
\t\t}};
/* End XCBuildConfiguration section */

/* Begin XCConfigurationList section */
\t\t{config_list_proj} = {{
\t\t\tisa = XCConfigurationList;
\t\t\tbuildConfigurations = ({config_debug}, {config_release});
\t\t\tdefaultConfigurationIsVisible = 0;
\t\t\tdefaultConfigurationName = Release;
\t\t}};
\t\t{config_list_tgt} = {{
\t\t\tisa = XCConfigurationList;
\t\t\tbuildConfigurations = ({tgt_debug}, {tgt_release});
\t\t\tdefaultConfigurationIsVisible = 0;
\t\t\tdefaultConfigurationName = Release;
\t\t}};
/* End XCConfigurationList section */

\t}};
\trootObject = {project_uid};
}}
"""

out = PROJ / "project.pbxproj"
out.write_text(content)
print(f"Generated: {out}")
print("Open PlannrSwiftUI.xcodeproj in Xcode to build and run.")
