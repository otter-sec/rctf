module.exports = api => {
  const env = api.cache(() => process.env.NODE_ENV)

  return {
    plugins: [
      [
        'const-enum',
        {
          transform: 'constObject',
        },
      ],
    ],
    presets: [
      [
        '@babel/preset-typescript',
        {
          isTSX: true,
          allExtensions: true,
        },
      ],
      [
        '@babel/preset-react',
        {
          runtime: 'automatic',
          development: env === 'development',
        },
      ],
      [
        '@babel/preset-env',
        {
          targets: { esmodules: true },
          bugfixes: true,
        },
      ],
    ],
  }
}
