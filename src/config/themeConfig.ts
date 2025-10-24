// theme/themeConfig.ts - Fellou.ai inspired glass morphism theme
import type { ThemeConfig } from 'antd';
import { theme as antdDarkTheme } from 'antd';

// Create Ant Design theme configuration with glass morphism style
const theme: ThemeConfig = {
  algorithm: antdDarkTheme.darkAlgorithm, // Use dark algorithm
  token: {
    // Base colors - purple accent theme (Fellou.ai Eko style)
    colorPrimary: '#5e31d8',      // Purple primary color (Fellou.ai)
    colorPrimaryHover: '#914bf1',  // Lighter purple on hover
    colorSuccess: '#10B981',       // Green success color
    colorWarning: '#F59E0B',       // Amber warning color
    colorError: '#EF4444',         // Red error color
    colorInfo: '#914bf1',          // Purple info color

    // Text colors - high contrast white (Fellou.ai style)
    colorText: '#ffffff',                             // Primary text - pure white
    colorTextSecondary: '#d9d9d9',                    // Secondary text - light gray
    colorTextTertiary: 'rgba(255, 255, 255, 0.5)',    // Tertiary text
    colorTextQuaternary: 'rgba(255, 255, 255, 0.6)',  // Message text

    // Background colors - glass morphism (Fellou.ai #ffffff0f style)
    colorBgContainer: 'rgba(255, 255, 255, 0.06)',     // Container background (~10% opacity)
    colorBgElevated: 'rgba(255, 255, 255, 0.06)',      // Elevated background
    colorBgLayout: 'rgba(255, 255, 255, 0.04)',        // Layout background
    colorBgSpotlight: 'rgba(255, 255, 255, 0.08)',     // Spotlight background

    // Border colors - subtle borders (Fellou.ai rgba(255,255,255,.17))
    colorBorder: 'rgba(255, 255, 255, 0.17)', // Border color - 17% opacity
    colorBorderSecondary: 'rgba(255, 255, 255, 0.1)', // Secondary border

    // Others - Fellou.ai inspired
    borderRadius: 12,              // Base border radius
    borderRadiusLG: 20,            // Large components (cards, modals)
    borderRadiusXS: 8,             // Small components (buttons)
    fontSize: 14,
    fontSizeHeading1: 48,          // Large headings
    fontSizeHeading2: 32,          // Medium headings
    fontFamily: 'system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"',

    // Shadows - deeper shadows for glass effect
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    boxShadowSecondary: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
  },
  components: {
    // Drawer component - Fellou.ai inspired glass morphism
    Drawer: {
      colorBgElevated: '#1e1c23',                          // Fellou.ai gradient start color
      colorText: '#ffffff',                                // Pure white text
      colorIcon: '#d9d9d9',                                // Light gray icons
      colorIconHover: '#914bf1',                           // Purple hover (Fellou.ai)
      colorBorder: 'rgba(255, 255, 255, 0.17)',            // Fellou.ai border style
      paddingLG: 24,                                       // Larger padding like Fellou.ai
      borderRadiusLG: 20,                                  // Rounded corners
    },

    // Button - Fellou.ai style
    Button: {
      colorPrimary: '#5e31d8',                             // Purple primary (Fellou.ai)
      colorPrimaryHover: '#914bf1',                        // Lighter purple on hover
      borderRadius: 8,                                     // 8px border radius
      paddingContentHorizontal: 16,                        // 16px horizontal padding
      paddingContentVertical: 8,                           // 8px vertical padding
      fontWeight: 500,                                     // Medium weight
    },

    // Card - Fellou.ai glass morphism
    Card: {
      colorBgContainer: 'rgba(255, 255, 255, 0.06)',       // Semi-transparent background
      colorBorder: 'rgba(255, 255, 255, 0.17)',            // Subtle border
      borderRadiusLG: 24,                                  // Large rounded corners (20-24px)
      paddingLG: 32,                                       // Generous padding
    },

    // List component
    List: {
      colorBgContainer: 'transparent',                     // Transparent background
      colorText: '#ffffff',                                // Pure white text
      colorTextSecondary: '#d9d9d9',                       // Light gray secondary
      paddingLG: 16,
    },

    // Input - Fellou.ai style
    Input: {
      colorBgContainer: 'rgba(255, 255, 255, 0.06)',       // Glass background
      colorText: '#ffffff',                                // White text
      colorTextPlaceholder: 'rgba(255, 255, 255, 0.5)',    // 50% opacity placeholder
      colorBorder: 'rgba(255, 255, 255, 0.17)',            // Fellou.ai border
      activeBg: 'rgba(255, 255, 255, 0.08)',               // Active background
      hoverBg: 'rgba(255, 255, 255, 0.06)',                // Hover background
      activeShadow: '0 0 0 2px rgba(145, 75, 241, 0.2)',   // Focus shadow with light purple
      borderRadius: 12,                                    // 12px border radius
      paddingBlock: 8,                                     // Vertical padding (reduced for better alignment)
      paddingInline: 12,                                   // Horizontal padding
      controlHeight: 40,                                   // Fixed height for alignment
    },

    // Tag component
    Tag: {
      borderRadiusSM: 6,
      colorBgContainer: 'rgba(255, 255, 255, 0.06)',
    },

    // Tooltip component
    Tooltip: {
      colorBgSpotlight: 'rgba(255, 255, 255, 0.08)',
      colorTextLightSolid: '#ffffff',
      borderRadius: 8,
    },

    // Popconfirm component
    Popconfirm: {
      colorBgElevated: 'rgba(255, 255, 255, 0.08)',        // Glass background
      colorText: '#ffffff',                                // White text
      colorWarning: '#F59E0B',                             // Amber warning
      borderRadius: 10,
    },

    // Message component
    Message: {
      colorSuccess: '#10B981',
      colorError: '#EF4444',
      colorWarning: '#F59E0B',
      colorInfo: '#5e31d8',                              // Purple info (Fellou.ai)
      colorBgElevated: 'rgba(255, 255, 255, 0.08)',
      borderRadius: 10,
    },

    // Modal - Fellou.ai inspired
    Modal: {
      contentBg: '#1e1c23',                              // Fellou.ai gradient start
      headerBg: '#1e1c23',                               // Consistent header
      footerBg: '#1e1c23',                               // Consistent footer
      colorText: '#ffffff',                              // Pure white text
      colorBorder: 'rgba(255, 255, 255, 0.17)',          // Fellou.ai border
      borderRadiusLG: 20,                                // Large rounded corners
      paddingContentHorizontal: 32,                      // Generous padding
      paddingContentVertical: 24,
    },

    // Select component
    Select: {
      colorBgContainer: 'rgba(255, 255, 255, 0.06)',       // Select background
      colorBgElevated: 'rgba(8, 12, 16, 0.96)',            // Dropdown background
      colorText: '#ffffff',                                 // Text color
      colorBorder: 'rgba(255, 255, 255, 0.17)',            // Border color
      colorPrimaryBorder: 'rgba(145, 75, 241, 0.4)',       // Light purple border on focus
      activeBorderColor: 'rgba(145, 75, 241, 0.4)',        // Active border
      hoverBorderColor: 'rgba(145, 75, 241, 0.3)',         // Hover border
      borderRadius: 12,
      optionSelectedBg: 'rgba(94, 49, 216, 0.2)',          // Selected option background
      optionActiveBg: 'rgba(94, 49, 216, 0.1)',            // Active option background
    },

    // Switch component
    Switch: {
      colorPrimary: '#5e31d8',                           // Purple primary (Fellou.ai)
      colorPrimaryHover: '#914bf1',                      // Lighter purple on hover
    }
  }
};

export default theme;