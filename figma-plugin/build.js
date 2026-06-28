const esbuild = require('esbuild');

async function run() {
  const options = {
    entryPoints: ['src/code.ts'],
    bundle: true,
    outfile: 'dist/code.js',
    target: 'es6',
  };
  
  if (process.argv.includes('--watch')) {
    const ctx = await esbuild.context(options);
    await ctx.watch();
  } else {
    await esbuild.build(options);
  }
}

run().catch(() => process.exit(1));
