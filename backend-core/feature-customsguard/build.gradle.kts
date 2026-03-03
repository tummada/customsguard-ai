plugins {
    `java-library`
}

dependencies {
    api(project(":platform-core"))

    // AWS S3 SDK for PDF storage (MinIO-compatible)
    implementation(platform("software.amazon.awssdk:bom:2.31.1"))
    implementation("software.amazon.awssdk:s3")

    // PDFBox for text extraction from PDF
    implementation("org.apache.pdfbox:pdfbox:3.0.4")
}
