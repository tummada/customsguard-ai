package com.vollos.feature.customsguard.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

import java.net.URI;

@Service
public class S3StorageService {

    private static final Logger log = LoggerFactory.getLogger(S3StorageService.class);

    private final S3Client s3Client;
    private final String bucketName;

    public S3StorageService(
            @Value("${s3.bucket-name}") String bucketName,
            @Value("${s3.endpoint:}") String endpoint,
            @Value("${s3.access-key-id:}") String accessKeyId,
            @Value("${s3.secret-access-key:}") String secretAccessKey,
            @Value("${s3.region:auto}") String region) {
        this.bucketName = bucketName;

        var builder = S3Client.builder()
                .region(Region.of(region.equals("auto") ? "us-east-1" : region))
                .forcePathStyle(true);

        if (!accessKeyId.isBlank() && !secretAccessKey.isBlank()) {
            builder.credentialsProvider(StaticCredentialsProvider.create(
                    AwsBasicCredentials.create(accessKeyId, secretAccessKey)));
        }

        if (!endpoint.isBlank()) {
            builder.endpointOverride(URI.create(endpoint));
        }

        this.s3Client = builder.build();
        log.info("S3StorageService initialized: bucket={}, endpoint={}", bucketName,
                endpoint.isBlank() ? "AWS default" : endpoint);
    }

    public String uploadPdf(byte[] data, String key) {
        log.info("Uploading PDF to S3: bucket={}, key={}, size={} bytes",
                bucketName, key, data.length);

        s3Client.putObject(
                PutObjectRequest.builder()
                        .bucket(bucketName)
                        .key(key)
                        .contentType("application/pdf")
                        .build(),
                RequestBody.fromBytes(data));

        return key;
    }

    public byte[] downloadPdf(String key) {
        log.info("Downloading PDF from S3: bucket={}, key={}", bucketName, key);

        return s3Client.getObjectAsBytes(
                GetObjectRequest.builder()
                        .bucket(bucketName)
                        .key(key)
                        .build())
                .asByteArray();
    }
}
