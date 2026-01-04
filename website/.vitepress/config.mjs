import { defineConfig } from 'vitepress'

export default defineConfig({
    title: "Arela v5",
    description: "The AI's Memory Layer for Vibecoding",
    base: '/arela/',

    themeConfig: {
        logo: '/logo.svg',

        nav: [
            { text: 'Home', link: '/' },
            { text: 'Guide', link: '/guide/getting-started' },
            { text: 'Tools', link: '/tools/' },
            { text: 'Dashboard', link: '/dashboard' },
            { text: 'GitHub', link: 'https://github.com/NewDara-Star/arela' }
        ],

        sidebar: {
            '/guide/': [
                {
                    text: 'Introduction',
                    items: [
                        { text: 'What is Arela?', link: '/guide/' },
                        { text: 'Getting Started', link: '/guide/getting-started' },
                        { text: 'Core Concepts', link: '/guide/concepts' }
                    ]
                },
                {
                    text: 'Setup',
                    items: [
                        { text: 'IDE Integration', link: '/guide/ide-integration' },
                        { text: 'Architecture', link: '/guide/architecture' },
                        { text: 'Philosophy', link: '/guide/philosophy' }
                    ]
                }
            ],
            '/tools/': [
                {
                    text: 'MCP Tools Reference',
                    items: [
                        { text: 'Overview', link: '/tools/' },
                        { text: 'arela_context', link: '/tools/context' },
                        { text: 'arela_update', link: '/tools/update' },
                        { text: 'arela_status', link: '/tools/status' },
                        { text: 'arela_verify', link: '/tools/verify' },
                        { text: 'arela_graph_impact', link: '/tools/graph-impact' },
                        { text: 'arela_graph_refresh', link: '/tools/graph-refresh' },
                        { text: 'arela_vector_search', link: '/tools/vector-search' },
                        { text: 'arela_vector_index', link: '/tools/vector-index' },
                        { text: 'arela_focus', link: '/tools/focus' },
                        { text: 'arela_translate', link: '/tools/translate' },
                        { text: 'arela_prd', link: '/tools/prd' },
                        { text: 'arela_checklist', link: '/tools/checklist' }
                    ]
                }
            ]
        },

        socialLinks: [
            { icon: 'github', link: 'https://github.com/NewDara-Star/arela' }
        ],

        footer: {
            message: 'Built with VitePress',
            copyright: 'Copyright © 2026 Star'
        }
    }
})
