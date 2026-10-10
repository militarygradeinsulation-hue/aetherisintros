import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import {
  autoMap,
  mapSheetRows,
  markDuplicateCandidates,
  parseCsv,
  parseXlsx,
  sha256Hex,
  type CheckedImportRecord,
  type ImportSheet,
} from "../import";

describe("private library imports", () => {
  it("maps the CTOguy contact-person and business-name columns without guessing a title", () => {
    const sheet = parseCsv(
      "Name,Sector,Contact Person,Phone,Email,Website,Address,Source of Info\nAcme,Property,Morgan Lee,555-0100,morgan@example.test,https://acme.test,Denver,Referral",
    )[0]!;
    const [entry] = mapSheetRows(sheet, autoMap(sheet.headers), "synthetic.csv");
    expect(entry!.record).toMatchObject({
      record_type: "person",
      name: "Morgan Lee",
      business: "Acme",
      industry: "Property",
      title: "",
      raw_contact_person: "Morgan Lee",
      source_reference: "Referral",
      verification_status: "unverified",
    });
    expect(entry!.record.original_columns["Name"]).toBe("Acme");
    expect(entry!.warnings).toContain(
      "Do-not-contact status is unknown; import is not consent for outreach.",
    );
  });

  it("recognizes Power-Leads header variants and joins first/last, city, and state", () => {
    const headers = [
      "Company Nmae",
      "First Name",
      "Last Name",
      "Job Title",
      "Phone Number",
      "Email Address",
      "Web Url",
      "City",
      "State",
      "Lead Source",
      "DNC Check",
    ];
    const sheet: ImportSheet = {
      name: "Leads",
      headers,
      rows: [
        {
          sourceRow: 8,
          cells: [
            "Northwind",
            "Avery",
            "Stone",
            "CEO",
            "555-0111",
            "avery@example.test",
            "https://northwind.test",
            "Austin",
            "TX",
            "Trade show",
            "Do Not Call",
          ],
        },
      ],
    };
    const [entry] = mapSheetRows(sheet, autoMap(headers), "synthetic.xlsx");
    expect(entry!.record).toMatchObject({
      record_type: "person",
      name: "Avery Stone",
      business: "Northwind",
      title: "CEO",
      phone: "555-0111",
      email: "avery@example.test",
      location: "Austin, TX",
      website: "https://northwind.test",
      source_reference: "Trade show",
      dnc_status: "Do Not Call",
      source_sheet: "Leads",
      source_row: 8,
    });
  });

  it.each(["Company", "Company Name", "Company Nmae", "Organization Name"])(
    "maps company-header variant %s without losing the contact name",
    (companyHeader) => {
      const headers = [
        companyHeader,
        "Full Name",
        "Title",
        "Phone #",
        "Email Address",
        "Web Url",
        "Physical Address",
        "Content Source",
        "DNC Status",
      ];
      const sheet: ImportSheet = {
        name: "Leads",
        headers,
        rows: [
          {
            sourceRow: 11,
            cells: [
              "Northwind",
              "Riley Morgan",
              "COO",
              "555-0133",
              "riley@example.test",
              "https://northwind.test",
              "Boise, ID",
              "Referral",
              "No",
            ],
          },
        ],
      };
      const [entry] = mapSheetRows(sheet, autoMap(headers), "synthetic.xlsx");
      expect(entry!.record).toMatchObject({
        record_type: "person",
        name: "Riley Morgan",
        business: "Northwind",
        title: "COO",
        phone: "555-0133",
        email: "riley@example.test",
        website: "https://northwind.test",
        location: "Boise, ID",
        source_reference: "Referral",
        dnc_status: "No",
      });
    },
  );

  it("keeps company-only account rows as organizations", () => {
    const headers = [
      "Account Name",
      "Domain",
      "Website",
      "Industry",
      "City",
      "State",
      "Assigned To",
    ];
    const sheet: ImportSheet = {
      name: "Accounts",
      headers,
      rows: [
        {
          sourceRow: 2,
          cells: [
            "Contoso",
            "contoso.test",
            "https://contoso.test",
            "Manufacturing",
            "Reno",
            "NV",
            "Not a contact",
          ],
        },
      ],
    };
    const [entry] = mapSheetRows(sheet, autoMap(headers), "accounts.xlsx");
    expect(entry!.record).toMatchObject({
      record_type: "organization",
      name: "Contoso",
      business: "Contoso",
      website: "https://contoso.test",
      industry: "Manufacturing",
      location: "Reno, NV",
      title: "",
    });
    expect(entry!.record.name).not.toBe("Not a contact");
  });

  it("accepts the normalized CSV contract and forces imported records to unverified", () => {
    const headers = [
      "record_type",
      "name",
      "phone",
      "email",
      "business",
      "title",
      "location",
      "website",
      "industry",
      "raw_contact_person",
      "source_file",
      "source_sheet",
      "source_row",
      "source_reference",
      "dnc_status",
      "verification_status",
      "duplicate_candidate",
    ];
    const sheet: ImportSheet = {
      name: "Normalized",
      headers,
      rows: [
        {
          sourceRow: 2,
          cells: [
            "person",
            "Sam Example",
            "555-0188",
            "sam@example.test",
            "Example Co",
            "CFO",
            "Chicago, IL",
            "https://example.test",
            "Finance",
            "Samuel Example",
            "ctoguy.csv",
            "Contacts",
            "77",
            "Original import",
            "Do Not Contact",
            "verified",
            "true",
          ],
        },
      ],
    };
    const [entry] = mapSheetRows(sheet, autoMap(headers), "normalized.csv");
    expect(entry!.record).toMatchObject({
      record_type: "person",
      name: "Sam Example",
      phone: "555-0188",
      business: "Example Co",
      source_file: "ctoguy.csv",
      source_sheet: "Contacts",
      source_row: 77,
      dnc_status: "Do Not Contact",
      verification_status: "unverified",
      duplicate_candidate: true,
    });
  });

  it("flags identical source rows across sheets without deduplicating them", () => {
    const headers = ["Company", "Full Name", "Email", "Phone"];
    const row = { sourceRow: 3, cells: ["Acme", "Taylor Chen", "taylor@example.test", "555-0100"] };
    const mapping = autoMap(headers);
    const a = mapSheetRows({ name: "PM East", headers, rows: [row] }, mapping, "leads.xlsx")[0]!;
    const b = mapSheetRows({ name: "PM West", headers, rows: [row] }, mapping, "leads.xlsx")[0]!;
    const flagged = markDuplicateCandidates([a, b]);
    expect(flagged).toHaveLength(2);
    expect(flagged.every((entry) => entry.record.duplicate_candidate)).toBe(true);
  });

  it("does not flag a shared phone or email alone, and never matches a name alone", () => {
    const make = (name: string, email: string, phone: string): CheckedImportRecord => ({
      key: name,
      errors: [],
      warnings: [],
      record: {
        record_type: "person",
        name,
        email,
        phone,
        business: "",
        title: "",
        location: "",
        website: "",
        industry: "",
        raw_contact_person: "",
        source_file: "synthetic.csv",
        source_sheet: "CSV",
        source_row: 2,
        source_reference: "",
        dnc_status: "unknown",
        verification_status: "unverified",
        duplicate_candidate: false,
        original_columns: { Name: name, Email: email, Phone: phone },
      },
    });
    const rows = markDuplicateCandidates([
      make("Jordan Lee", "shared@example.test", "555-0100"),
      make("Casey Park", "shared@example.test", "555-0100"),
      make("Jordan Lee", "other@example.test", "555-0199"),
    ]);
    expect(rows.every((entry) => !entry.record.duplicate_candidate)).toBe(true);
  });

  it("preserves duplicate column labels and reports malformed workbooks recoverably", async () => {
    const sheet = parseCsv("Name,Name\nFirst,Second")[0]!;
    const [entry] = mapSheetRows(sheet, autoMap(sheet.headers), "duplicate-headers.csv");
    expect(entry!.record.original_columns).toEqual({ Name: "First", "Name [2]": "Second" });
    await expect(parseXlsx(new Uint8Array([1, 2, 3, 4]))).rejects.toThrow(
      /save or export it as normalized CSV/i,
    );
  });

  it("reads all synthetic workbook sheets and produces stable content hashes", async () => {
    const workbook = new ExcelJS.Workbook();
    workbook.addWorksheet("Accounts").addRows([
      ["Account Name", "Industry", "Assigned To"],
      ["Example LLC", "Services", "Private"],
    ]);
    workbook.addWorksheet("Contacts").addRows([
      ["Company", "First Name", "Last Name", "Title"],
      ["Example LLC", "Alex", "Rivera", "Director"],
    ]);
    const data = new Uint8Array(await workbook.xlsx.writeBuffer());
    const sheets = await parseXlsx(data);
    expect(sheets.map((sheet) => sheet.name)).toEqual(["Accounts", "Contacts"]);
    expect(sheets[0]!.rows[0]!.sourceRow).toBe(2);
    expect(
      mapSheetRows(sheets[0]!, autoMap(sheets[0]!.headers), "synthetic.xlsx")[0]!.record
        .record_type,
    ).toBe("organization");
    expect(
      mapSheetRows(sheets[1]!, autoMap(sheets[1]!.headers), "synthetic.xlsx")[0]!.record.name,
    ).toBe("Alex Rivera");
    expect(await sha256Hex(data)).toBe(await sha256Hex(data));
  });
});
