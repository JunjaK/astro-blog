import type { TechIconType, TechStackType } from '@/types/commonType';

const techIcons: Record<string, TechStackType> = {
  dark: {
    amazonec2: { techName: 'Amazon EC2', iconUrl: '/images/icon/tech-stack/dark/amazonec2.svg' },
    amazons3: { techName: 'Amazon S3', iconUrl: '/images/icon/tech-stack/dark/amazons3.svg' },
    antdesign: { techName: 'Ant Design', iconUrl: '/images/icon/tech-stack/dark/antdesign.svg' },
    astro: { techName: 'Astro', iconUrl: '/images/icon/tech-stack/dark/astro.svg' },
    bun: { techName: 'Bun', iconUrl: '/images/icon/tech-stack/dark/bun.svg' },
    chartdotjs: { techName: 'Chart.js', iconUrl: '/images/icon/tech-stack/dark/chartdotjs.svg' },
    d3: { techName: 'D3', iconUrl: '/images/icon/tech-stack/dark/d3.svg' },
    docker: { techName: 'Docker', iconUrl: '/images/icon/tech-stack/dark/docker.svg' },
    express: { techName: 'Express', iconUrl: '/images/icon/tech-stack/dark/express.svg' },
    flutter: { techName: 'Flutter', iconUrl: '/images/icon/tech-stack/dark/flutter.svg' },
    framermotion: { techName: 'Framer Motion', iconUrl: '/images/icon/tech-stack/dark/framer.svg' },
    githubactions: { techName: 'GitHub Actions', iconUrl: '/images/icon/tech-stack/dark/github.svg' },
    gitlabcicd: { techName: 'GitLab CI/CD', iconUrl: '/images/icon/tech-stack/dark/gitlab.svg' },
    graphql: { techName: 'GraphQL', iconUrl: '/images/icon/tech-stack/dark/graphql.svg' },
    javascript: { techName: 'JavaScript', iconUrl: '/images/icon/tech-stack/dark/javascript.svg' },
    mediapipe: { techName: 'MediaPipe', iconUrl: '/images/icon/tech-stack/dark/mediapipe.svg' },
    mongodb: { techName: 'MongoDB', iconUrl: '/images/icon/tech-stack/dark/mongodb.svg' },
    mysql: { techName: 'MySQL', iconUrl: '/images/icon/tech-stack/dark/mysql.svg' },
    netlify: { techName: 'Netlify', iconUrl: '/images/icon/tech-stack/dark/netlify.svg' },
    nextdotjs: { techName: 'Next.js', iconUrl: '/images/icon/tech-stack/dark/nextdotjs.svg' },
    nginx: { techName: 'NGINX', iconUrl: '/images/icon/tech-stack/dark/nginx.svg' },
    nodedotjs: { techName: 'Node.js', iconUrl: '/images/icon/tech-stack/dark/nodedotjs.svg' },
    nodered: { techName: 'Node-RED', iconUrl: '/images/icon/tech-stack/dark/nodered.svg' },
    npmworkspace: { techName: 'Npm Workspace', iconUrl: '/images/icon/tech-stack/dark/npm.svg' },
    nuxt: { techName: 'Nuxt.js', iconUrl: '/images/icon/tech-stack/dark/nuxt.svg' },
    pm2: { techName: 'PM2', iconUrl: '/images/icon/tech-stack/dark/pm2.svg' },
    postgresql: { techName: 'PostgreSQL', iconUrl: '/images/icon/tech-stack/dark/postgresql.svg' },
    python: { techName: 'Python', iconUrl: '/images/icon/tech-stack/dark/python.svg' },
    react: { techName: 'React', iconUrl: '/images/icon/tech-stack/dark/react.svg' },
    sass: { techName: 'Sass', iconUrl: '/images/icon/tech-stack/dark/sass.svg' },
    slidev: { techName: 'Sass', iconUrl: '/images/icon/tech-stack/dark/slidev.svg' },
    socketdotio: { techName: 'Socket.io', iconUrl: '/images/icon/tech-stack/dark/socketdotio.svg' },
    sonatypenexus: { techName: 'Sonatype Nexus', iconUrl: '/images/icon/tech-stack/dark/sonatype.svg' },
    spring: { techName: 'Spring', iconUrl: '/images/icon/tech-stack/dark/spring.svg' },
    swagger: { techName: 'Swagger Generation', iconUrl: '/images/icon/tech-stack/dark/swagger.svg' },
    tailwindcss: { techName: 'Tailwind CSS', iconUrl: '/images/icon/tech-stack/dark/tailwindcss.svg' },
    typescript: { techName: 'TypeScript', iconUrl: '/images/icon/tech-stack/dark/typescript.svg' },
    unitywebgl: { techName: 'Unity WebGL', iconUrl: '/images/icon/tech-stack/dark/typescript.svg' },
    vite: { techName: 'Vite', iconUrl: '/images/icon/tech-stack/dark/vite.svg' },
    vue: { techName: 'Vue', iconUrl: '/images/icon/tech-stack/dark/vuedotjs.svg' },
    vuetify: { techName: 'Vuetify', iconUrl: '/images/icon/tech-stack/dark/vuetify.svg' },
    webpack: { techName: 'Webpack', iconUrl: '/images/icon/tech-stack/dark/webpack.svg' },
    wijmogrid: { techName: 'Wijmo Grid', iconUrl: '/images/icon/tech-stack/dark/wijmo.svg' },
    yarn: { techName: 'Yarn', iconUrl: '/images/icon/tech-stack/dark/yarn.svg' },
  },
  light: {
    amazonec2: { techName: 'Amazon EC2', iconUrl: '/images/icon/tech-stack/light/amazonec2.svg' },
    amazons3: { techName: 'Amazon S3', iconUrl: '/images/icon/tech-stack/light/amazons3.svg' },
    antdesign: { techName: 'Ant Design', iconUrl: '/images/icon/tech-stack/light/antdesign.svg' },
    astro: { techName: 'Astro', iconUrl: '/images/icon/tech-stack/light/astro.svg' },
    bun: { techName: 'Bun', iconUrl: '/images/icon/tech-stack/light/bun.svg' },
    chartdotjs: { techName: 'Chart.js', iconUrl: '/images/icon/tech-stack/light/chartdotjs.svg' },
    d3: { techName: 'D3', iconUrl: '/images/icon/tech-stack/light/d3.svg' },
    docker: { techName: 'Docker', iconUrl: '/images/icon/tech-stack/light/docker.svg' },
    express: { techName: 'Express', iconUrl: '/images/icon/tech-stack/light/express.svg' },
    flutter: { techName: 'Flutter', iconUrl: '/images/icon/tech-stack/light/flutter.svg' },
    framermotion: { techName: 'Framer Motion', iconUrl: '/images/icon/tech-stack/light/framer.svg' },
    githubactions: { techName: 'GitHub Actions', iconUrl: '/images/icon/tech-stack/light/github.svg' },
    gitlabcicd: { techName: 'GitLab CI/CD', iconUrl: '/images/icon/tech-stack/light/gitlab.svg' },
    graphql: { techName: 'GraphQL', iconUrl: '/images/icon/tech-stack/light/graphql.svg' },
    javascript: { techName: 'JavaScript', iconUrl: '/images/icon/tech-stack/light/javascript.svg' },
    mediapipe: { techName: 'MediaPipe', iconUrl: '/images/icon/tech-stack/light/mediapipe.svg' },
    mongodb: { techName: 'MongoDB', iconUrl: '/images/icon/tech-stack/light/mongodb.svg' },
    mysql: { techName: 'MySQL', iconUrl: '/images/icon/tech-stack/light/mysql.svg' },
    netlify: { techName: 'Netlify', iconUrl: '/images/icon/tech-stack/light/netlify.svg' },
    nextdotjs: { techName: 'Next.js', iconUrl: '/images/icon/tech-stack/light/nextdotjs.svg' },
    nginx: { techName: 'NGINX', iconUrl: '/images/icon/tech-stack/light/nginx.svg' },
    nodedotjs: { techName: 'Node.js', iconUrl: '/images/icon/tech-stack/light/nodedotjs.svg' },
    nodered: { techName: 'Node-RED', iconUrl: '/images/icon/tech-stack/light/nodered.svg' },
    npmworkspace: { techName: 'Npm Workspace', iconUrl: '/images/icon/tech-stack/light/npm.svg' },
    nuxt: { techName: 'Nuxt.js', iconUrl: '/images/icon/tech-stack/light/nuxt.svg' },
    pm2: { techName: 'PM2', iconUrl: '/images/icon/tech-stack/light/pm2.svg' },
    postgresql: { techName: 'PostgreSQL', iconUrl: '/images/icon/tech-stack/light/postgresql.svg' },
    python: { techName: 'Python', iconUrl: '/images/icon/tech-stack/light/python.svg' },
    react: { techName: 'React', iconUrl: '/images/icon/tech-stack/light/react.svg' },
    sass: { techName: 'Sass', iconUrl: '/images/icon/tech-stack/light/sass.svg' },
    slidev: { techName: 'Sass', iconUrl: '/images/icon/tech-stack/light/slidev.svg' },
    socketdotio: { techName: 'Socket.io', iconUrl: '/images/icon/tech-stack/light/socketdotio.svg' },
    sonatypenexus: { techName: 'Sonatype Nexus', iconUrl: '/images/icon/tech-stack/light/sonatype.svg' },
    spring: { techName: 'Spring', iconUrl: '/images/icon/tech-stack/light/spring.svg' },
    swagger: { techName: 'Swagger Generation', iconUrl: '/images/icon/tech-stack/light/swagger.svg' },
    tailwindcss: { techName: 'Tailwind CSS', iconUrl: '/images/icon/tech-stack/light/tailwindcss.svg' },
    typescript: { techName: 'TypeScript', iconUrl: '/images/icon/tech-stack/light/typescript.svg' },
    unitywebgl: { techName: 'Unity WebGL', iconUrl: '/images/icon/tech-stack/light/typescript.svg' },
    vite: { techName: 'Vite', iconUrl: '/images/icon/tech-stack/light/vite.svg' },
    vue: { techName: 'Vue', iconUrl: '/images/icon/tech-stack/light/vuedotjs.svg' },
    vuetify: { techName: 'Vuetify', iconUrl: '/images/icon/tech-stack/light/vuetify.svg' },
    webpack: { techName: 'Webpack', iconUrl: '/images/icon/tech-stack/light/webpack.svg' },
    wijmogrid: { techName: 'Wijmo Grid', iconUrl: '/images/icon/tech-stack/light/wijmo.svg' },
    yarn: { techName: 'Yarn', iconUrl: '/images/icon/tech-stack/light/yarn.svg' },
  },
};

function getTechIcons(techStacks: string[], mode: string): TechIconType[] {
  const icons = mode === 'dark' ? techIcons.dark : techIcons.light;
  return techStacks.map((tech) => {
    return icons[tech.toLowerCase()] || { techName: tech, iconUrl: '' };
  });
}

export default getTechIcons;
