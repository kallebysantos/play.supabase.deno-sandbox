import { Sandbox } from './sandbox.ts'

const sandboxes = await Sandbox.list()

const sandbox = sandboxes.at(0) ?? await Sandbox.create()
console.log(sandbox)

const denoEvalOutput = await sandbox.runCommand('deno', [
  'eval',
  `console.log('Hello from Sandbox!!', 2 + 2)`,
])
console.log(denoEvalOutput)

const catPrivateFileOutput = await sandbox.runCommand('cat', ['~/my-test-file'])
console.log('cat ~/my-test-file', catPrivateFileOutput)

await sandbox.upload('./hello.txt', './my-hello.txt')

const catFileOutput = await sandbox.runCommand('cat', ['./my-hello.txt'])
console.log('cat ./my-hello.txt', catFileOutput)

/*
sandboxes = await Sandbox.list()
console.log('terminating all sandboxes:', sandboxes.length)

for (const item of sandboxes) {
  console.log(item.id, await item.terminate())
}
*/
