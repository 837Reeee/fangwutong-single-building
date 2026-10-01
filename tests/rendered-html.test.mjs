import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("serves the standalone single-building management site", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>房务通 · 单栋出租楼管理<\/title>/);
  assert.match(html, /fangwutong\.single-building\.v2/);
  assert.match(html, /fangwutong\.single-building\.v1/);
  assert.match(html, /localStorage\.setItem/);
  assert.match(html, /receipt-canvas/);
  assert.match(html, /canvas\.toBlob/);
  assert.match(html, /aria-controls="sidebar"/);
  assert.doesNotMatch(
    html,
    /codex-preview|react-loading-skeleton|SEARCH_ENGINES|IntersectionObserver/,
  );
});

test("includes the three complete two-level business menus", async () => {
  const response = await render();
  const html = await response.text();

  for (const menuLabel of [
    "房间管理",
    "房间总览",
    "在租房间",
    "空置房间",
    "房间设置",
    "水电录入",
    "本月录入",
    "批量导入",
    "抄表记录",
    "费用设置",
    "租金收据",
    "开具收据",
    "收据记录",
    "模板设置",
  ]) {
    assert.match(html, new RegExp(menuLabel));
  }
});

test("contains default room, billing, and receipt rules", async () => {
  const response = await render();
  const html = await response.text();

  assert.match(html, /floor <= 6/);
  assert.match(html, /unit <= 4/);
  assert.match(html, /waterRate: 3\.5/);
  assert.match(html, /electricRate: 0\.8/);
  assert.match(html, /RENT-\$\{period\.replace/);
  assert.match(html, /本期读数不能低于上期读数/);
  assert.match(html, /该房间存在水电或收据记录/);
  assert.match(html, /record\.inputMode === "monthly-usage"/);
  assert.match(html, /mnist-12\.onnx/);
  assert.match(html, /单组或左右双组三列/);
  assert.match(html, /房租、水、电费（专用）收据/);
  assert.match(html, /chineseUppercaseMoney/);
  assert.match(html, /sanitationAmount/);
  assert.match(html, /managementAmount/);
  assert.match(html, /meterSnapshot/);
});

test("recalculates existing meter records after utility rate changes", async () => {
  const response = await render();
  const html = await response.text();
  assert.match(html, /function updateExistingMeterRates/);
  assert.match(html, /const synchronizedMeterRates = updateExistingMeterRates/);
  assert.match(html, /record\.waterRate = waterRate/);
  assert.match(html, /record\.electricRate = electricRate/);
  assert.match(html, /record\.waterCharge = Number/);
  assert.match(html, /record\.electricCharge = Number/);
  assert.match(html, /已经开具的历史收据金额不会改变/);
});

test("supports selecting and batch downloading receipt images", async () => {
  const response = await render();
  const html = await response.text();

  assert.match(html, /批量下载/);
  assert.match(html, /receipt-select-all/);
  assert.match(html, /downloadSelectedReceipts/);
  assert.match(html, /application\/zip/);
});

test("supports working single and batch receipt creation", async () => {
  const response = await render();
  const html = await response.text();

  assert.match(html, /保存并下载收据/);
  assert.match(html, /批量开具租金收据/);
  assert.match(html, /batch-receipt-form/);
  assert.match(html, /批量开具并下载/);
  assert.match(html, /createReceiptRecord/);
  assert.match(html, /const meter = state\.meterRecords\.find/);
  assert.match(html, /document\.addEventListener\("submit", async/);
});

test("uses tenant fee defaults and renders the simplified receipt header", async () => {
  const response = await render();
  const html = await response.text();
  const receiptRenderer = html.slice(
    html.indexOf("function createReceiptImageBlob"),
    html.indexOf("function safeDownloadName"),
  );

  for (const fieldId of [
    "room-sanitation",
    "room-tv",
    "room-internet",
    "room-management",
    "room-other",
    "room-payment-method",
  ]) {
    assert.match(html, new RegExp(fieldId));
  }
  assert.match(html, /rooms: saved\.rooms\.map/);
  assert.match(html, /Number\(room\.sanitationAmount \|\| 0\)\.toFixed/);
  assert.match(html, /batchReceiptDraft\.paymentMethod === "room-default"/);
  assert.match(receiptRenderer, /receipt\.buildingName \|\| state\.settings\.buildingName/);
  assert.match(receiptRenderer, /receipt\.roomNumber\}房/);
  assert.doesNotMatch(receiptRenderer, /receipt\.tenantName/);
  assert.doesNotMatch(receiptRenderer, /存根|客户|账期：|备注：/);
});

test("supports free-form handwritten three-column meter imports", async () => {
  const response = await render();
  const html = await response.text();

  assert.match(html, /FREEFORM_TEMPLATE_VERSION = "freeform-3col-v1"/);
  assert.match(html, /inputMode: "freeform-reading"/);
  assert.match(html, /detectFreeformPaper/);
  assert.match(html, /rectifyFreeformImage/);
  assert.match(html, /detectFreeformRows/);
  assert.match(html, /distanceToAlignmentSegment/);
  assert.match(html, /distance < 14/);
  assert.match(html, /rowBackground - 26/);
  assert.match(html, /canvas\.height \* 0\.002/);
  assert.match(html, /const thresholds = \[/);
  assert.match(html, /recognizeFreeformField/);
  assert.match(html, /alignment-canvas/);
  assert.match(html, /alignmentRangeControl\("columnOne"/);
  assert.match(html, /左组第一根蓝线|第一根蓝线/);
  assert.match(html, /setAlignmentGuideValue/);
  assert.match(html, /syncAlignmentControlRanges/);
  assert.match(html, /detectFreeformInkGuides/);
  assert.match(html, /percentileBackground/);
  assert.match(html, /horizontal\.length < 3/);
  assert.match(html, /const detectedColumns = \[/);
  assert.match(html, /detectedBands\.length < referenceBands\.length \* 0\.5/);
  assert.match(html, /columnThresholds/);
  assert.match(html, /applyRoomSequenceCorrection/);
  assert.match(html, /rows\.length > orderedRooms\.length/);
  assert.match(html, /freeformElectricEndRatio/);
  assert.match(html, /matchFreeformColumnBands/);
  assert.match(html, /const strengthened = new Float32Array/);
  assert.match(html, /13\.5 - massX \/ mass/);
  assert.match(html, /choosePlausibleReading/);
  assert.match(html, /previous\?\.currentWater/);
  assert.match(html, /previous\?\.currentElectric/);
  assert.match(html, /candidates\.slice\(0, 3\)/);
  assert.match(html, /splitDigitRunAtValleys/);
  assert.match(html, /expectedDigits/);
  assert.match(html, /centerDigitTensor/);
  assert.match(html, /deskewDigitTensor/);
  assert.match(html, /weight: 0\.43/);
  assert.match(html, /dominantNumericRoomDigitCount/);
  assert.match(html, /chooseKnownRoomCandidate/);
  assert.match(html, /action: "match"/);
  assert.match(html, /skipCost = current \+ 0\.28/);
  assert.match(html, /data-action="recognize-freeform"/);
  assert.match(html, /applyPreviousReadingToRow/);
  assert.match(html, /values\.currentWater < values\.prevWater/);
  assert.match(html, /values\.currentElectric < values\.prevElectric/);
  assert.match(html, /已核对房号和全部读数/);
  assert.doesNotMatch(html, /固定 A4 模板|下载模板|打印 A4 模板/);
  assert.doesNotMatch(html, /set-import-mode|download-meter-template|print-meter-template/);
  assert.doesNotMatch(html, /createMeterTemplateCanvas|findCornerMarkers|rectifyTemplateImage|recognizeTemplateField/);
  assert.doesNotMatch(html, /inputMode: "monthly-usage"/);
});

test("recognizes single and side-by-side three-column meter sheets", async () => {
  const response = await render();
  const html = await response.text();

  assert.match(html, /FREEFORM_LAYOUT_AUTO = "auto"/);
  assert.match(html, /FREEFORM_LAYOUT_SINGLE = "single"/);
  assert.match(html, /FREEFORM_LAYOUT_DOUBLE = "double"/);
  assert.match(html, /id="import-layout-mode"/);
  assert.match(html, /左右双组三列/);
  assert.match(html, /detectFreeformGridGuides/);
  assert.match(html, /detectRectifiedGridGuides/);
  assert.match(html, /gridRowRatios/);
  assert.match(html, /isHorizontalInk/);
  assert.match(html, /doubleGapDeviation <= 0\.24/);
  assert.match(html, /suppressFreeformTableLines/);
  assert.match(html, /freeformGridCellBands/);
  assert.match(html, /freeformColumnGroups/);
  assert.match(html, /columnThree/);
  assert.match(html, /columnFour/);
  assert.match(html, /groupSplit/);
  assert.match(html, /horizontalLines/);
  assert.match(html, /rowBackgrounds/);
  assert.match(html, /columnBackgrounds/);
  assert.match(html, /inkMask/);
  assert.match(html, /band\.gridIndex === 0/);
  assert.match(html, /if \(!rawRoom\) continue/);
  assert.match(html, /previewCanvas = canvas/);
});

test("previews final single and batch receipts before saving", async () => {
  const response = await render();
  const html = await response.text();

  assert.match(html, /最终收据预览/);
  assert.match(html, /receipt-final-preview/);
  assert.match(html, /batch-receipt-final-preview/);
  assert.match(html, /receipt-preview-dialog/);
  assert.match(html, /scheduleReceiptPreview/);
  assert.match(html, /buildSingleReceiptPreview/);
  assert.match(html, /buildBatchReceiptPreview/);
  assert.match(html, /createReceiptImageBlob\(receipt\)/);
  assert.match(html, /data-action="open-receipt-preview"/);
});

test("uses a template-level default receipt signature date", async () => {
  const response = await render();
  const html = await response.text();

  assert.match(html, /receiptDefaultDate: toLocalDateInput/);
  assert.match(html, /name="receiptDefaultDate"/);
  assert.match(html, /state\.settings\.receiptDefaultDate \|\| toLocalDateInput/);
  assert.match(html, /batchReceiptDraft\.receivedAt = state\.settings\.receiptDefaultDate/);
  assert.match(html, /receivedAt: String\(data\.get\("receivedAt"\)\)/);
  assert.match(html, /const \[year, month, day\] = String\(receipt\.receivedAt/);
});

test("snapshots and renders a customizable rent amount prefix", async () => {
  const response = await render();
  const html = await response.text();

  assert.match(html, /rentAmountPrefix: ""/);
  assert.match(html, /name="rentAmountPrefix" maxlength="20"/);
  assert.match(html, /rentAmountPrefix: state\.settings\.rentAmountPrefix \|\| ""/);
  assert.match(html, /const rentAmountPrefix = String\(receipt\.rentAmountPrefix \|\| ""\)/);
  assert.match(html, /\? `\$\{rentAmountPrefix\}　¥ \$\{formatMoney\(receipt\.rent\)\}`/);
  assert.match(html, /state\.settings\.rentAmountPrefix = String/);
});

test("exports and safely restores complete local backups", async () => {
  const response = await render();
  const html = await response.text();

  assert.match(html, /data-backup/);
  assert.match(html, /fangwutong-single-building-backup/);
  assert.match(html, /BACKUP_FORMAT_VERSION = 1/);
  assert.match(html, /MAX_BACKUP_FILE_SIZE = 10 \* 1024 \* 1024/);
  assert.match(html, /createBackupPayload/);
  assert.match(html, /settings: source\.settings/);
  assert.match(html, /rooms: source\.rooms/);
  assert.match(html, /meterRecords: source\.meterRecords/);
  assert.match(html, /receipts: source\.receipts/);
  assert.match(html, /validateBackupPayload/);
  assert.match(html, /normalizeState\(saved\)/);
  assert.match(html, /存在重复房号/);
  assert.match(html, /关联的房间不存在/);
  assert.match(html, /data-action="confirm-restore"/);
  assert.match(html, /完整替换并恢复/);
  assert.match(html, /resetTransientWorkspace/);
  assert.match(html, /id="backup-drop-zone"/);
});
