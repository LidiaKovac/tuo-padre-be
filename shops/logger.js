import moment from "moment"
import config from "../logger.config.json" assert { type: "json" }
import { readFileSync, writeFileSync } from "fs"
import { log } from "console"
export class Logger {
  static __hierarchy = ["error", "warn", "info", "debug"] //wip
  tabLvl = 0
  static msgColor = {
    error: "\x1b[91m",
    warn: "\x1b[33m",
    info: "\x1b[36m",
    debug: "\x1b[90m",
  }
  static exec(lvl, msg) {
    if (this.isLogLvl(lvl)) {
      const date = moment(new Date()).format("gg/MM/YYYY, hh:mm")
      const tabs = "   ".repeat(this.tabLvl)
      this.tabLvl = 0
      const res = {
        prefix: `${this.msgColor[lvl]}[${lvl.toUpperCase()}] ${date} ||${tabs}`,
        msg,
        reset: `\x1b[0m`,
      }
      if (config.persistent) {
        const logFile = readFileSync("log.txt")
        writeFileSync("log.txt", `${logFile}\n${res.prefix} ${res.msg}`)
      }
      return res
    } else {
      this.tabLvl = 0
      return
    }
  }
  static isLogLvl(lvl) {
    const configIndex = this.__hierarchy.findIndex(
      (el) => el === config.logLevel
    )
    const actualIndex = this.__hierarchy.findIndex((el) => el === lvl)
    if (configIndex == -1 || actualIndex == -1) {
      console.log(
        `${this.msgColor.error}[ERROR] ${moment(new Date()).format(
          "gg/MM/YYYY, hh:mm"
        )} ||${"   ".repeat(this.tabLvl)}`,
        "Unknown log level, found: ",
        config.logLevel
      )
    }
    return configIndex >= actualIndex
  }
  static log(message) {
    if (!this.isLogLvl("info")) return
    const { prefix, msg, reset } = this.exec("info", message)
    console.log(prefix, msg, reset)
  }
  static error(message) {
    if (!this.isLogLvl("error")) return

    const { prefix, msg, reset } = this.exec("error", message)
    console.log(prefix, msg, reset)
  }
  static warning(message) {
    if (!this.isLogLvl("warn")) return

    const { prefix, msg, reset } = this.exec("warn", message)
    console.log(prefix, msg, reset)
  }

  static debug(message) {
    if (!this.isLogLvl("debug")) return

    const { prefix, msg, reset } = this.exec("debug", message)
    console.log(prefix, msg, reset)
  }

  static persistent(lvl, message) {
    const { prefix, msg } = this.exec(lvl, message)
    console.log(msg)
  }
  static level(num) {
    this.tabLvl = num
    return this
  }
}
Logger.warning(`Logger level: ${config.logLevel}`)
