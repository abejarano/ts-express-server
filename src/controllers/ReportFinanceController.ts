import { Request, Response } from "express";
import { Controller, Get, Use } from "../decorators";

// Mock middlewares for demonstration
const PermissionMiddleware = (req: any, res: any, next: any) => next();
const Can =
  (resource: string, action: string) => (req: any, res: any, next: any) =>
    next();

@Controller("/reports")
export class ReportFinanceController {
  @Get("/monthly-tithes")
  @Use([PermissionMiddleware, Can("reports", "monthly_tithes")])
  async getMonthlyTithes(req: Request, res: Response) {
    // Call your service or logic here
    res.json({ message: "Monthly Tithes" });
  }

  @Get("/income-statement")
  @Use([PermissionMiddleware, Can("reports", "income_statements")])
  async getIncomeStatement(req: Request, res: Response) {
    res.json({ message: "Income Statement" });
  }

  @Get("/income-statement/pdf")
  @Use([PermissionMiddleware, Can("reports", "income_statements")])
  async getIncomeStatementPdf(req: Request, res: Response) {
    res.json({ message: "Income Statement PDF" });
  }

  @Get("/dre")
  @Use([PermissionMiddleware, Can("financial_records", "reports")])
  async getDRE(req: Request, res: Response) {
    res.json({ message: "DRE" });
  }

  @Get("/dre/pdf")
  @Use([PermissionMiddleware, Can("financial_records", "reports")])
  async getDREPdf(req: Request, res: Response) {
    res.json({ message: "DRE PDF" });
  }
}
