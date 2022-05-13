// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require("prism-react-renderer/themes/github");
const darkCodeTheme = require("prism-react-renderer/themes/dracula");
const sidebarItemsGenerator = require("./sidebarItemsGenerator");

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: "Bloom Docs",
  tagline: "Let's grow a library",
  url: "https://docs.bloomlibrary.com",
  baseUrl: "/",
  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",
  favicon: "img/favicon.ico",
  organizationName: "BloomBooks",
  projectName: "bloom-docs",

  presets: [
    [
      "classic",
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          routeBasePath: "/", // Serve the docs at the site's root

          //editUrl: 'https://github.com/BloomBooks/bloom-docs',
          sidebarItemsGenerator: sidebarItemsGenerator,
        },
        blog: false,
        theme: {
          customCss: require.resolve("./src/css/custom.css"),
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      navbar: {
        title: "Bloom Docs",
        logo: {
          alt: "My Site Logo",
          src: "img/logo.svg",
        },
      },

      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
    }),
};

module.exports = config;
