import Foundation
import Vision
import AppKit

let args = CommandLine.arguments
guard args.count >= 2 else { print("usage: ocr img [x0 y0 x1 y1]"); exit(1) }
let path = args[1]
var crop: CGRect? = nil
if args.count >= 6, let x0 = Double(args[2]), let y0 = Double(args[3]), let x1 = Double(args[4]), let y1 = Double(args[5]) {
    crop = CGRect(x: x0, y: y0, width: x1-x0, height: y1-y0)
}
guard let img = NSImage(contentsOfFile: path), let cg0 = img.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
    FileHandle.standardError.write("cannot load image\n".data(using:.utf8)!); exit(1)
}
var cg = cg0
if let c = crop, let cropped = cg0.cropping(to: CGRect(x: c.minX * CGFloat(cg0.width), y: c.minY * CGFloat(cg0.height), width: c.width * CGFloat(cg0.width), height: c.height * CGFloat(cg0.height))) {
    cg = cropped
}
let req = VNRecognizeTextRequest()
req.recognitionLevel = .accurate
req.usesLanguageCorrection = false
req.recognitionLanguages = ["en-US"]
let h = VNImageRequestHandler(cgImage: cg, options: [:])
try h.perform([req])
let obs = (req.results ?? []).compactMap { $0 as? VNRecognizedTextObservation }
var rows: [(Double, Double, String)] = []
for o in obs { if let t = o.topCandidates(1).first { rows.append((Double(o.boundingBox.midY), Double(o.boundingBox.minX), t.string)) } }
rows.sort { a, b in abs(a.0-b.0) < 0.02 ? a.1 < b.1 : a.0 > b.0 }
var out = ""
var lastY = -1.0
for r in rows {
    if lastY >= 0 && abs(r.0 - lastY) > 0.02 { out += "\n" } else if lastY >= 0 { out += "  " }
    out += r.2
    lastY = r.0
}
print(out)
