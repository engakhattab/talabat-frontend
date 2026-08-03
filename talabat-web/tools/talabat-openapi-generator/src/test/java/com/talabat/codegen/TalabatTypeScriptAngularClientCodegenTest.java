package com.talabat.codegen;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.openapitools.codegen.DefaultGenerator;
import org.openapitools.codegen.config.CodegenConfigurator;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TalabatTypeScriptAngularClientCodegenTest {
    @TempDir
    Path temporaryDirectory;

    @Test
    void generatesFeatureApisDomainModelsWorkingImportsAndDeterministicOutput() throws Exception {
        Path first = generate("first");
        Path second = generate("second");

        assertFile(first, "api/order-history/order-history-api.service.ts");
        assertFile(first, "api/shared-items/shared-items-api.service.ts");
        assertFile(first, "model/order-history/simple-model.ts");
        assertFile(first, "model/order-history/composite-model.ts");
        assertFile(first, "model/shared-items/shared-items-response.ts");
        assertFile(first, "model/shared/shared-thing.ts");
        assertFile(first, "model/shared/delivery-status.ts");

        String historyService = read(first, "api/order-history/order-history-api.service.ts");
        String sharedService = read(first, "api/shared-items/shared-items-api.service.ts");
        String compositeModel = read(first, "model/order-history/composite-model.ts");
        String sharedItemsResponse = read(first, "model/shared-items/shared-items-response.ts");
        String apiBarrel = read(first, "api/api.ts");
        String modelBarrel = read(first, "model/models.ts");
        String index = read(first, "index.ts");

        assertTrue(historyService.contains("from '../../model/shared/shared-thing'"));
        assertTrue(sharedService.contains("from '../../model/shared-items/shared-items-response'"));
        assertTrue(historyService.contains("Observable<void>"));
        assertFalse(historyService.contains(": any"));
        assertTrue(compositeModel.contains("from './simple-model'"));
        assertTrue(compositeModel.contains("from '../shared/shared-thing'"));
        assertTrue(sharedItemsResponse.contains("from '../shared/shared-thing'"));
        assertTrue(apiBarrel.contains("'./order-history/order-history-api.service'"));
        assertTrue(apiBarrel.contains("'./shared-items/shared-items-api.service'"));
        assertTrue(modelBarrel.contains("'./order-history/simple-model'"));
        assertTrue(modelBarrel.contains("'./shared-items/shared-items-response'"));
        assertTrue(modelBarrel.contains("'./shared/delivery-status'"));
        assertTrue(index.contains("export * from './api/api';"));
        assertTrue(index.contains("export * from './model/models';"));

        assertNoUnexpectedFlatGeneratedFiles(first.resolve("api"), "api.ts");
        assertNoUnexpectedFlatGeneratedFiles(first.resolve("model"), "models.ts");
        assertModelDomains(first);
        assertEquals(snapshot(first), snapshot(second));
    }

    private Path generate(String name) throws Exception {
        Path output = temporaryDirectory.resolve(name);
        Path fixture = Path.of(java.util.Objects.requireNonNull(
                getClass().getResource("/regression-api.yaml")
        ).toURI()).toAbsolutePath();
        Path repositoryRoot = Path.of(System.getProperty("talabat.repository.root")).toAbsolutePath().normalize();
        Path templates = repositoryRoot.resolve("openapi/templates/typescript-angular");

        CodegenConfigurator configurator = new CodegenConfigurator()
                .setGeneratorName("talabat-typescript-angular")
                .setInputSpec(fixture.toString())
                .setOutputDir(output.toString())
                .setTemplateDir(templates.toString())
                .addAdditionalProperty("npmName", "@talabat/generator-regression")
                .addAdditionalProperty("serviceSuffix", "ApiService")
                .addAdditionalProperty("serviceFileSuffix", "-api.service")
                .addAdditionalProperty("stringEnums", true)
                .addAdditionalProperty("providedInRoot", true)
                .addAdditionalProperty("providedIn", "root")
                .addAdditionalProperty("useSingleRequestParameter", true)
                .addAdditionalProperty("withInterfaces", false)
                .addAdditionalProperty("supportsES6", true)
                .addAdditionalProperty("fileNaming", "kebab-case")
                .addAdditionalProperty("enumPropertyNaming", "PascalCase")
                .addAdditionalProperty("ngVersion", "22.0.0");

        new DefaultGenerator().opts(configurator.toClientOptInput()).generate();
        return output;
    }

    private static void assertFile(Path root, String relativePath) {
        assertTrue(Files.isRegularFile(root.resolve(relativePath)), "Missing " + relativePath);
    }

    private static String read(Path root, String relativePath) throws IOException {
        return Files.readString(root.resolve(relativePath), StandardCharsets.UTF_8);
    }

    private static void assertNoUnexpectedFlatGeneratedFiles(Path directory, String allowedFile) throws IOException {
        try (Stream<Path> children = Files.list(directory)) {
            assertEquals(
                    java.util.List.of(allowedFile),
                    children.filter(Files::isRegularFile)
                            .map(path -> path.getFileName().toString())
                            .filter(name -> name.endsWith(".ts"))
                            .sorted()
                            .collect(Collectors.toList())
            );
        }
    }

    private static void assertModelDomains(Path root) throws IOException {
        Path modelRoot = root.resolve("model");
        try (Stream<Path> domains = Files.list(modelRoot)) {
            assertEquals(
                    java.util.List.of("order-history", "shared", "shared-items"),
                    domains.filter(Files::isDirectory)
                            .map(path -> path.getFileName().toString())
                            .sorted()
                            .collect(Collectors.toList())
            );
        }
        try (Stream<Path> nestedDirectories = Files.walk(modelRoot)) {
            assertEquals(
                    3,
                    nestedDirectories.filter(Files::isDirectory).count() - 1,
                    "Model domains must not contain per-model directories"
            );
        }
        try (Stream<Path> modelFiles = Files.walk(modelRoot)) {
            assertEquals(
                    5,
                    modelFiles.filter(path -> Files.isRegularFile(path) && path.toString().endsWith(".ts"))
                            .filter(path -> !path.getFileName().toString().equals("models.ts"))
                            .count(),
                    "Each schema must be generated exactly once"
            );
        }
    }

    private static Map<String, String> snapshot(Path root) throws IOException, NoSuchAlgorithmException {
        Map<String, String> files = new TreeMap<>();
        MessageDigest digest = MessageDigest.getInstance("SHA-256");
        try (Stream<Path> paths = Files.walk(root)) {
            for (Path path : paths.filter(Files::isRegularFile).toList()) {
                String relative = root.relativize(path).toString().replace('\\', '/');
                if (!relative.startsWith(".openapi-generator/")) {
                    files.put(relative, HexFormat.of().formatHex(digest.digest(Files.readAllBytes(path))));
                }
            }
        }
        return files;
    }
}
