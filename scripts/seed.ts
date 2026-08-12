import 'dotenv/config'
import { runSeed } from '../app/shared/db/seed'

await runSeed()
process.exit(0)
