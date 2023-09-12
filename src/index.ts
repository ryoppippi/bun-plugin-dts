import path from 'node:path'
import fs from 'node:fs'
import { getTsconfig } from 'get-tsconfig'
import { generateDtsBundle, type CompilationOptions, type EntryPointConfig } from 'dts-bundle-generator'

type Options = Omit<EntryPointConfig, 'filePath'> & {
  compilationOptions?: CompilationOptions
}

const dts = (options?: Options): import('bun').BunPlugin => {
  return {
    name: 'bun-plugin-dts',
    async setup(build) {
      const { compilationOptions, ...rest } = options || {}

      const entrypoints = [...build.config.entrypoints].sort()
      const entries = entrypoints.map((entry) => {
        return {
          filePath: entry,
          ...rest
        }
      })

      const tsconfig = compilationOptions?.preferredConfigPath ?? getTsconfig()?.path
      const result = generateDtsBundle(entries, {
        ...compilationOptions,
        preferredConfigPath: tsconfig
      })

      const outDir = build.config.outdir || './dist'
      if (!fs.existsSync(outDir)) {
        fs.mkdirSync(outDir)
      }

      await Promise.all(
        entrypoints.map((entry, index) => {
          const dtsFile = entry.replace(/^.*\//, '').replace(/\.ts$/, '.d.ts')
          const outFile = path.join(outDir, dtsFile)
          return Bun.write(outFile, result[index])
        })
      )
    }
  }
}

export default dts
