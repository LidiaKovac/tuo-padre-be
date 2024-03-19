import moment from "moment";
import config from "../logger.config.json" assert { type: "json" };
export class Logger {
  static __hierarchy = ["error", "warn", "info", "debug"]; //wip
  tabLvl = 0;
  static msgColor = {
    error: "🟥",
    warn: "🟨",
    info: "🟦",
    debug: "🤯",
  };
  static exec(lvl, msg) {
    if (this.isLogLvl(lvl)) {
      const date = moment(new Date()).format("gg/MM/YYYY, hh:mm");
      const tabs = "   ".repeat(this.tabLvl);
      console.log(
        `${this.msgColor[lvl]}[${lvl.toUpperCase()}] ${date} ||${tabs}`,
        msg
      );
    }
    this.tabLvl = 0;
  }
  static isLogLvl(lvl) {
    // console.log(
    //   `${this.msgColor.debug}[DEBUG] ${moment(new Date()).format("gg/MM/YYYY, hh:mm")} ||${"   ".repeat(this.tabLvl)}`,
    //   "Log level: ", config.logLevel
    // );
    const configIndex = this.__hierarchy.findIndex(
      (el) => el === config.logLevel
    );
    const actualIndex = this.__hierarchy.findIndex((el) => el === lvl);
    if (configIndex == -1 || actualIndex == -1) {
      console.log(
        `${this.msgColor.error}[ERROR] ${moment(new Date()).format(
          "gg/MM/YYYY, hh:mm"
        )} ||${"   ".repeat(this.tabLvl)}`,
        "Unknown log level, found: ",
        config.logLevel
      );
    }
    return configIndex >= actualIndex;
  }
  static log(message) {
    this.exec("info", message);
  }
  static error(message) {
    this.exec("error", message);
  }
  static warning(message) {
    this.exec("warn", message);
  }

  static debug(message) {
    this.exec("debug", message);
  }

  static level(num) {
    this.tabLvl = num;
    return this;
  }
}
