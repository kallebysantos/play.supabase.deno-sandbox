import { Sandbox } from './sandbox.ts'

let sandboxes = await Sandbox.list()

const sandbox = sandboxes.at(0) ?? await Sandbox.create()

const output = await sandbox.evalCode(`console.log('Hello from Sandbox!!', 2 + 2)`)
console.log(output)

sandboxes = await Sandbox.list()
// console.log('terminating all sandboxes:', sandboxes.length)

/*
for (const item of sandboxes) {
  console.log(item.id, await item.terminate())
}
*/
