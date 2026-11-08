// Start, stop and check the EC2 machine that runs the Alpha Ledger server. Signed-in users only.
// Uses its own AWS user (alpha-ledger-instance-controller), which can only start, stop and see this machine.
// Its keys are read here, on the web app's server side, and never reach the browser.
import { DescribeInstancesCommand, EC2Client, StartInstancesCommand, StopInstancesCommand } from "@aws-sdk/client-ec2";
import { auth } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";

const INSTANCE_ID = process.env.EC2_INSTANCE_ID ?? "";

function ec2() {
  return new EC2Client({
    region: "ap-south-1",
    credentials: {
      accessKeyId: process.env.POWER_AWS_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.POWER_AWS_SECRET_ACCESS_KEY ?? "",
    },
  });
}

function fail(status: number, code: string, message: string) {
  return NextResponse.json({ error: { code, message } }, { status });
}

async function machineState(): Promise<string> {
  const r = await ec2().send(new DescribeInstancesCommand({ InstanceIds: [INSTANCE_ID] }));
  return r.Reservations?.[0]?.Instances?.[0]?.State?.Name ?? "unknown";
}

export async function GET() {
  if (!(await auth()).userId) return fail(401, "signed_out", "Sign in first.");
  try {
    return NextResponse.json({ state: await machineState() });
  } catch {
    return fail(502, "aws_error", "Couldn't reach AWS to check the machine.");
  }
}

export async function POST(req: NextRequest) {
  if (!(await auth()).userId) return fail(401, "signed_out", "Sign in first.");
  const { action } = await req.json().catch(() => ({ action: null }));
  if (action !== "start" && action !== "stop") return fail(400, "bad_action", "Action must be start or stop.");
  try {
    const command =
      action === "start" ? new StartInstancesCommand({ InstanceIds: [INSTANCE_ID] }) : new StopInstancesCommand({ InstanceIds: [INSTANCE_ID] });
    await ec2().send(command);
    return NextResponse.json({ state: await machineState() });
  } catch {
    return fail(502, "aws_error", `Couldn't ${action} the machine.`);
  }
}
