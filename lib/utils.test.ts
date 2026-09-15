import {describe,expect,it} from "vitest";
import {maskEmail,maskPhone,safeUrl} from "./utils";
describe("privacy helpers",()=>{it("masks identifiers",()=>{expect(maskEmail("jesse@example.com")).toBe("j****@example.com");expect(maskPhone("13812341234")).toBe("138****1234")});it("only accepts web URLs",()=>{expect(safeUrl("javascript:alert(1)")).toBeUndefined();expect(safeUrl("https://example.com")).toBe("https://example.com/")})});
