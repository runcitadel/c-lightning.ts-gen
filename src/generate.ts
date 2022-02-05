import * as fs from "fs";
import * as fsPromises from "fs/promises";
import { compile } from "json-schema-to-typescript";
import camelcase from "camelcase";
import pascalcase from "pascalcase";

/**
 * Parse a synopsis
 *
 * A synopsis looks something like this
 *
 * **offer** *amount* *description* \[*issuer*\] \[*label*\] \[*quantity_min*\] \[*quantity_max*\] \[*absolute_expiry*\] \[*recurrence*\] \[*recurrence_base*\] \[*recurrence_paywindow*\] \[*recurrence_limit*\] \[*single_use*\]
 *
 * The part in ** ** is the name of the command
 * Everything in * * is a parameter
 * Everything in \[\] is an optional parameter
 * @param synopsis The synopsis to parse
 */

function parseSynopsis(synopsis: string): {
  name: string;
  parameters: string[];
  optionalParameters: string[];
} {
  const parts = synopsis.split("**");
  if (!parts[1]) {
    console.log(synopsis);
  }
  const name = parts[1].trim().replaceAll("\\", "");
  const parameters = parts[2]
    .split("\\[")[0]
    .split("*")
    .map((p) => p.trim().replaceAll("\\", ""));
  // Remove all values which are ""
  parameters.forEach((p, i) => {
    if (p === "") {
      parameters.splice(i, 1);
    }
  });
  let optionalParameters: string[] = [];
  if (parts[2].split("\\[")[1]) {
    let split = parts[2].split("\\[");
    split.shift();
    split.forEach((p) => {
      if (!p.split("*")[1]) {
        console.log(p);
      }
      optionalParameters.push(p.split("*")[1].trim().replaceAll("\\", ""));
    });
  }
  return {
    name,
    parameters,
    optionalParameters,
  };
}

function parsedSynopsisToTsInterface(synopsis: {
  name: string;
  parameters: string[];
  optionalParameters: string[];
}) {
  let result = `export interface ${pascalcase(synopsis.name)}Request {`;
  synopsis.parameters.forEach((p) => {
    result += `\n  ${p}: /* GUESSED */ string;`;
  });
  synopsis.optionalParameters.forEach((p) => {
    result += `\n  ${p}?: /* GUESSED */ string;`;
  });
  result += "\n}";
  return result;
}

// Recursively find all keys of an object called "type", then set them to "string" if they are "hex"
function fixHex(obj: any) {
  if (
    obj &&
    (obj.type === "hex" ||
      obj.type === "txid" ||
      obj.type == "pubkey" ||
      obj.type === "signature" ||
      obj.type === "short_channel_id" ||
      obj.type === "point32" ||
      obj.type === "bip340sig")
  ) {
    obj.tsType = `/* ${obj.type} */ string`;
  }
  if (
    obj &&
    (obj.type === "u8" || obj.type === "u16" || obj.type === "u32" || obj.type === "msat")
  ) {
    obj.tsType = `/* ${obj.type} */ number`;
  }
  if (obj && obj.type === "u64") {
    // We should look into BigInt
    obj.tsType = `/* ${obj.type} */ number`;
  }
  if (obj && typeof obj === "object") {
    Object.keys(obj).forEach((key) => {
      fixHex(obj[key]);
    });
  }
}

const files = fs.readdirSync("./c-lightning-doc");
let imports = "";
let generatedMethods = "";
for (const file of files) {
  if (file.endsWith(".7.md")) {
    const fileName = file.replace(".7.md", "").replace("lightning-", "");
    const fileContents = fs.readFileSync("./c-lightning-doc/" + file, "utf8");
    const jsonSchema = JSON.parse(
      fs.readFileSync(
        "./c-lightning-doc/schemas/" + fileName + ".schema.json",
        "utf8"
      )
    );
    fixHex(jsonSchema);
    const lines = fileContents.split("\n");
    const heading = lines[0];
    // Get the line that contains "DESCRIPTION"
    const descriptionLine = lines.findIndex((line) =>
      line.includes("DESCRIPTION")
    );
    const responseLine = lines.findIndex((line) =>
      line.includes("RETURN VALUE")
    );
    // All lines between description and return value
    // Except the lines themselves and the line directly after the description
    const descriptionLines =
      "/**" +
      lines
        .slice(descriptionLine + 2, responseLine - 1)
        .join("\n * ")
        .replaceAll("\\", "")
        .replaceAll("*/", "*\\/") +
      "\n*/";
    const methodDescriptionLines =
      "/**" +
      lines
        .slice(descriptionLine + 2, responseLine - 1)
        .join("\n   * ")
        .replaceAll("\\", "")
        .replaceAll("*/", "*\\/") +
      "\n  */";
    // Go backwards in lines from descriptionLine - 2 until we find an empty line,
    // Then join the lines with a space
    let realSynopsis = "";
    for (let i = descriptionLine - 2; i >= 0; i--) {
      if (lines[i].trim() === "") {
        break;
      }
      // If the line starts with an uppercase letter, go back two lines and skip this one
      if (lines[i].trim().match(/^[A-Z]/)) {
        i--;
        continue;
      }
      realSynopsis = lines[i] + " " + realSynopsis;
    }
    let parsedSynopsis = parseSynopsis(realSynopsis);
    const tsFileContents = `/**
 * ${heading}
 * 
 * ${realSynopsis}
 * 
 */

${descriptionLines}
${parsedSynopsisToTsInterface(parsedSynopsis)}

${await compile(jsonSchema, pascalcase(parsedSynopsis.name) + "Response", {
  bannerComment: "",
})}
`;
    await fsPromises.writeFile(
      "./generated/" + fileName + ".ts",
      tsFileContents
    );
    /*await fsPromises.writeFile(
      "./debug/" + fileName + ".json",
      JSON.stringify(jsonSchema),
    );*/
    let fnArguments = "";
    let requestType = pascalcase(parsedSynopsis.name) + "Request";
    let responseType = pascalcase(parsedSynopsis.name) + "Response";
    fnArguments = "payload: " + requestType;
    // If the parsed synopsis has no required parameters, then we can use an empty payload
    if (parsedSynopsis.parameters.length == 0) fnArguments += " = {}";
    generatedMethods += `
  ${methodDescriptionLines}
  ${camelcase(parsedSynopsis.name)}(${fnArguments}): Promise<${responseType}> {
    return this.call<${responseType}>("${parsedSynopsis.name}", payload);
  }
    `;
    imports += `
import type { ${requestType}, ${responseType} } from "./${fileName}";`;
  }
}

await fsPromises.writeFile(
  "./generated/main.ts",
  `
import * as net from "net";

${imports}

export default class RPCClient {
  constructor(public socketPath: string) {}
  protected call<ReturnType = unknown>(
    method: string,
    params = null
  ): Promise<ReturnType> {
    return new Promise((resolve, reject) => {
      let client = net.createConnection(this.socketPath);
      let payload = {
        method: method,
        params: params,
        id: 0,
      };
      client.write(JSON.stringify(payload));

      client.on("data", (data) => {
        client.end();
        let parsed = JSON.parse(data.toString("utf8"));
        return resolve(parsed.result as ReturnType);
      });
    });
  }

  ${generatedMethods}
}
`
);
