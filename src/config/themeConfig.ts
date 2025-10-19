// theme/themeConfig.ts
import type { ThemeConfig } from 'antd';
import { theme as antdDarkTheme } from 'antd';

// Create Ant Design theme configuration based on dark variables in globals.css
const theme: ThemeConfig = {
  algorithm: antdDarkTheme.darkAlgorithm, // Use dark algorithm
  token: {
    // Base colors
    colorPrimary: '#7E8DFF', // --color-text-05-dark primary color
    colorSuccess: '#07AB4B', // --color-text-09-dark success color
    colorWarning: '#FF9500', // --color-text-08-dark warning color
    colorError: '#E63C47',   // --color-text-10-dark error color
    colorInfo: '#636FFF',    // --color-text-05 info color

    // Text colors
    colorText: '#FAFBFC',           // --color-text-01-dark primary text
    colorTextSecondary: '#C4CAD5',  // --color-text-03-dark secondary text
    colorTextTertiary: '#828FA1',   // --color-text-04-dark tertiary text
    colorTextQuaternary: '#A9B2BE', // --color-text-12-dark message text

    // Background colors
    colorBgContainer: '#191E34',     // --background-color-tool-call container background
    colorBgElevated: '#24294A',      // --background-image-message elevated background
    colorBgLayout: '#1D273F',        // --background-color-thinking layout background
    colorBgSpotlight: '#263058',     // Spotlight background

    // Border colors
    colorBorder: 'rgba(78,94,132,1)', // --color-border-message border color
    colorBorderSecondary: 'rgba(96,109,140,0.3)', // Secondary border

    // Others
    borderRadius: 8,
    fontSize: 14,
    fontFamily: 'Arial, Helvetica, sans-serif',

    // Shadows
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
    boxShadowSecondary: '0 1px 4px rgba(0, 0, 0, 0.12)',
  },
  components: {
    // Drawer component customization
    Drawer: {
      colorBgElevated: '#191E34',        // Drawer background
      colorText: '#FAFBFC',              // Drawer text
      colorIcon: '#C4CAD5',              // Icon color
      colorIconHover: '#7E8DFF',         // Icon hover
      paddingLG: 16,                     // Large padding
    },

    // Button component customization
    Button: {
      colorPrimary: '#7E8DFF',
      colorPrimaryHover: '#9CA6FF',
      borderRadius: 6,
    },

    // List component customization
    List: {
      colorBgContainer: 'transparent',   // List background transparent
      colorText: '#FAFBFC',              // List text
      colorTextSecondary: '#C4CAD5',     // List secondary text
      paddingLG: 12,
    },

    // Input component customization
    Input: {
      colorBgContainer: '#191E34',       // Input background
      colorText: '#FAFBFC',              // Input text
      colorTextPlaceholder: '#828FA1',   // Placeholder text
      colorBorder: 'rgba(78,94,132,1)',  // Input border
      borderRadius: 8,
    },

    // Tag component customization
    Tag: {
      borderRadiusSM: 4,
    },

    // Tooltip component customization
    Tooltip: {
      colorBgSpotlight: '#24294A',
      colorTextLightSolid: '#FAFBFC',
      borderRadius: 6,
    },

    // Popconfirm component customization
    Popconfirm: {
      colorBgElevated: '#24294A',        // Popup background
      colorText: '#FAFBFC',              // Popup text
      colorWarning: '#FF9500',           // Warning icon color
      borderRadius: 8,
    },

    // Message component customization
    Message: {
      colorSuccess: '#07AB4B',
      colorError: '#E63C47',
      colorWarning: '#FF9500',
      colorInfo: '#7E8DFF',
      colorBgElevated: '#24294A',
      borderRadius: 8,
    }
  }
};

export default theme;