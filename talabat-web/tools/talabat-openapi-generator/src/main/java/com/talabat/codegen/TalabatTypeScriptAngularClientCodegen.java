package com.talabat.codegen;

import com.fasterxml.jackson.databind.JsonNode;
import io.swagger.v3.core.util.Json;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.Operation;
import io.swagger.v3.oas.models.PathItem;
import org.openapitools.codegen.CodegenModel;
import org.openapitools.codegen.languages.TypeScriptAngularClientCodegen;
import org.openapitools.codegen.model.ModelMap;
import org.openapitools.codegen.model.ModelsMap;
import org.openapitools.codegen.model.OperationMap;
import org.openapitools.codegen.model.OperationsMap;

import java.nio.file.Path;
import java.util.ArrayDeque;
import java.util.Collection;
import java.util.Deque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Keeps the upstream TypeScript Angular generator intact while grouping APIs and models by domain.
 */
public final class TalabatTypeScriptAngularClientCodegen extends TypeScriptAngularClientCodegen {
    private static final String CURRENT_DIRECTORY_PREFIX = "./";
    private static final String SCHEMA_REFERENCE_PREFIX = "#/components/schemas/";
    private static final String SHARED_MODEL_DOMAIN = "shared";
    private static final List<PathItem.HttpMethod> HTTP_METHODS = List.of(
            PathItem.HttpMethod.GET,
            PathItem.HttpMethod.PUT,
            PathItem.HttpMethod.POST,
            PathItem.HttpMethod.DELETE,
            PathItem.HttpMethod.OPTIONS,
            PathItem.HttpMethod.HEAD,
            PathItem.HttpMethod.PATCH,
            PathItem.HttpMethod.TRACE
    );

    private final Map<String, String> modelDomains = new HashMap<>();

    @Override
    public String getName() {
        return "talabat-typescript-angular";
    }

    @Override
    public String getHelp() {
        return "Generates Talabat's feature-folder TypeScript Angular client.";
    }

    @Override
    public String apiFilename(String templateName, String tag) {
        return nestApiFile(super.apiFilename(templateName, tag), templateName);
    }

    @Override
    public String apiFilename(String templateName, String tag, String outputDir) {
        return nestApiFile(super.apiFilename(templateName, tag, outputDir), templateName);
    }

    @Override
    public void preprocessOpenAPI(OpenAPI openAPI) {
        super.preprocessOpenAPI(openAPI);
        buildModelDomainMap(openAPI);
    }

    @Override
    public String modelFilename(String templateName, String modelName) {
        return nestModelFile(super.modelFilename(templateName, modelName), modelName);
    }

    @Override
    public String modelFilename(String templateName, String modelName, String outputDir) {
        return nestModelFile(super.modelFilename(templateName, modelName, outputDir), modelName);
    }

    @Override
    public String toApiImport(String name) {
        if (importMapping.containsKey(name)) {
            return importMapping.get(name);
        }

        String apiFile = toApiFilename(name);
        return apiPackage() + "/" + apiFeatureFolder(apiFile) + "/" + apiFile;
    }

    @Override
    public String toModelImport(String name) {
        if (importMapping.containsKey(name)) {
            return importMapping.get(name);
        }

        String modelFile = localModelFile(name);
        return "../../" + modelPackage() + "/" + modelDomain(name) + "/" + modelFile;
    }

    @Override
    public OperationsMap postProcessOperationsWithModels(OperationsMap operations, List<ModelMap> allModels) {
        OperationsMap result = super.postProcessOperationsWithModels(operations, allModels);
        OperationMap operation = result.getOperations();
        String apiFile = operation.get("apiFilename").toString();
        operation.put("apiFilename", apiFeatureFolder(apiFile) + "/" + apiFile);
        return result;
    }

    @Override
    public Map<String, ModelsMap> postProcessAllModels(Map<String, ModelsMap> models) {
        Map<String, ModelsMap> result = super.postProcessAllModels(models);

        for (ModelsMap modelsMap : result.values()) {
            for (ModelMap modelMap : modelsMap.getModels()) {
                CodegenModel model = modelMap.getModel();
                String modelFile = localModelFile(model.classname);
                String domain = modelDomain(model.classname);
                model.classFilename = CURRENT_DIRECTORY_PREFIX + domain + "/" + modelFile;
                rewriteModelImports(modelMap, domain);
            }
        }

        return result;
    }

    private String nestApiFile(String originalFilename, String templateName) {
        Path original = Path.of(originalFilename).normalize();
        String templateSuffix = apiTemplateFiles().get(templateName);
        String apiFileWithoutTemplateSuffix = stripSuffix(original.getFileName().toString(), templateSuffix);
        return original.getParent()
                .resolve(apiFeatureFolder(apiFileWithoutTemplateSuffix))
                .resolve(original.getFileName())
                .toString();
    }

    private String nestModelFile(String originalFilename, String modelName) {
        Path original = Path.of(originalFilename).normalize();
        return original.getParent()
                .resolve(modelDomain(modelName))
                .resolve(original.getFileName())
                .toString();
    }

    private String apiFeatureFolder(String apiFile) {
        return stripSuffix(apiFile, serviceFileSuffix);
    }

    private String localModelFile(String modelName) {
        String filename = toModelFilename(removeModelPrefixSuffix(modelName)).replace('\\', '/');
        if (filename.startsWith(CURRENT_DIRECTORY_PREFIX)) {
            return filename.substring(CURRENT_DIRECTORY_PREFIX.length());
        }
        return filename.substring(filename.lastIndexOf('/') + 1);
    }

    @SuppressWarnings("unchecked")
    private void rewriteModelImports(ModelMap modelMap, String currentDomain) {
        Object importsValue = modelMap.get("tsImports");
        if (!(importsValue instanceof List<?> imports)) {
            return;
        }

        for (Object importValue : imports) {
            if (!(importValue instanceof Map<?, ?> untypedImport)) {
                continue;
            }

            Map<String, String> modelImport = (Map<String, String>) untypedImport;
            String filename = modelImport.get("filename");
            if (filename != null && filename.startsWith(CURRENT_DIRECTORY_PREFIX)) {
                String importedModel = filename.substring(CURRENT_DIRECTORY_PREFIX.length());
                String importedDomain = modelDomain(importedModel);
                String relativeImport = importedDomain.equals(currentDomain)
                        ? CURRENT_DIRECTORY_PREFIX + importedModel
                        : "../" + importedDomain + "/" + importedModel;
                modelImport.put("filename", relativeImport);
            }
        }
    }

    private void buildModelDomainMap(OpenAPI openAPI) {
        modelDomains.clear();
        if (openAPI.getComponents() == null || openAPI.getComponents().getSchemas() == null) {
            return;
        }

        JsonNode document = Json.mapper().valueToTree(openAPI);
        Map<String, Set<String>> schemaDependencies = new LinkedHashMap<>();
        Map<String, Set<String>> schemaTags = new LinkedHashMap<>();

        for (Map.Entry<String, ?> schema : openAPI.getComponents().getSchemas().entrySet()) {
            Set<String> dependencies = new LinkedHashSet<>();
            collectSchemaReferences(
                    document.at("/components/schemas/" + escapeJsonPointer(schema.getKey())),
                    document,
                    dependencies,
                    new HashSet<>()
            );
            schemaDependencies.put(schema.getKey(), dependencies);
            schemaTags.put(schema.getKey(), new LinkedHashSet<>());
        }

        if (openAPI.getPaths() != null) {
            openAPI.getPaths().forEach((path, pathItem) -> collectOperationTags(
                    pathItem,
                    document,
                    schemaDependencies,
                    schemaTags
            ));
        }

        for (Map.Entry<String, Set<String>> usage : schemaTags.entrySet()) {
            String schemaName = usage.getKey();
            Set<String> tags = usage.getValue();
            if (tags.isEmpty()) {
                throw new IllegalStateException(
                        "Cannot classify model '" + schemaName + "': no tagged operation references it"
                );
            }

            String domain = tags.size() == 1
                    ? apiFeatureFolder(toApiFilename(tags.iterator().next()))
                    : SHARED_MODEL_DOMAIN;
            registerModelDomain(schemaName, domain);
        }
    }

    private void collectOperationTags(
            PathItem pathItem,
            JsonNode document,
            Map<String, Set<String>> schemaDependencies,
            Map<String, Set<String>> schemaTags
    ) {
        Map<PathItem.HttpMethod, Operation> operations = pathItem.readOperationsMap();
        for (PathItem.HttpMethod method : HTTP_METHODS) {
            Operation operation = operations.get(method);
            if (operation == null) {
                continue;
            }

            Set<String> directSchemas = new LinkedHashSet<>();
            collectSchemaReferences(
                    Json.mapper().valueToTree(operation),
                    document,
                    directSchemas,
                    new HashSet<>()
            );
            collectSchemaReferences(
                    Json.mapper().valueToTree(pathItem.getParameters()),
                    document,
                    directSchemas,
                    new HashSet<>()
            );

            Set<String> transitiveSchemas = transitiveSchemas(directSchemas, schemaDependencies);
            Collection<String> tags = operation.getTags() == null ? List.of() : operation.getTags();
            for (String schemaName : transitiveSchemas) {
                Set<String> referencingTags = schemaTags.get(schemaName);
                if (referencingTags != null) {
                    referencingTags.addAll(tags);
                }
            }
        }
    }

    private void collectSchemaReferences(
            JsonNode node,
            JsonNode document,
            Set<String> schemaReferences,
            Set<String> visitedComponentReferences
    ) {
        if (node == null || node.isMissingNode() || node.isNull()) {
            return;
        }

        if (node.isObject()) {
            JsonNode referenceNode = node.get("$ref");
            if (referenceNode != null && referenceNode.isTextual()) {
                String reference = referenceNode.textValue();
                if (reference.startsWith(SCHEMA_REFERENCE_PREFIX)) {
                    schemaReferences.add(unescapeJsonPointer(reference.substring(SCHEMA_REFERENCE_PREFIX.length())));
                    return;
                }
                if (reference.startsWith("#/") && visitedComponentReferences.add(reference)) {
                    collectSchemaReferences(
                            document.at(reference.substring(1)),
                            document,
                            schemaReferences,
                            visitedComponentReferences
                    );
                }
            }
            node.fields().forEachRemaining(field -> {
                if (!"$ref".equals(field.getKey())) {
                    collectSchemaReferences(
                            field.getValue(),
                            document,
                            schemaReferences,
                            visitedComponentReferences
                    );
                }
            });
            return;
        }

        if (node.isArray()) {
            node.forEach(child -> collectSchemaReferences(
                    child,
                    document,
                    schemaReferences,
                    visitedComponentReferences
            ));
        }
    }

    private static Set<String> transitiveSchemas(
            Set<String> directSchemas,
            Map<String, Set<String>> schemaDependencies
    ) {
        Set<String> result = new LinkedHashSet<>();
        Deque<String> pending = new ArrayDeque<>(directSchemas);
        while (!pending.isEmpty()) {
            String schemaName = pending.removeFirst();
            if (result.add(schemaName)) {
                pending.addAll(schemaDependencies.getOrDefault(schemaName, Set.of()));
            }
        }
        return result;
    }

    private void registerModelDomain(String schemaName, String domain) {
        registerModelIdentifier(schemaName, domain);
        registerModelIdentifier(toModelName(schemaName), domain);
        registerModelIdentifier(removeModelPrefixSuffix(toModelName(schemaName)), domain);
        registerModelIdentifier(localModelFile(schemaName), domain);
    }

    private void registerModelIdentifier(String identifier, String domain) {
        String previous = modelDomains.putIfAbsent(identifier, domain);
        if (previous != null && !previous.equals(domain)) {
            throw new IllegalStateException(
                    "Model identifier '" + identifier + "' maps to both '" + previous + "' and '" + domain + "'"
            );
        }
    }

    private String modelDomain(String modelName) {
        String direct = modelDomains.get(modelName);
        if (direct != null) {
            return direct;
        }

        String localFile = modelName.replace('\\', '/');
        localFile = localFile.substring(localFile.lastIndexOf('/') + 1);
        String byFilename = modelDomains.get(localFile);
        if (byFilename != null) {
            return byFilename;
        }

        throw new IllegalStateException("No operation-tag domain was calculated for model '" + modelName + "'");
    }

    private static String escapeJsonPointer(String value) {
        return value.replace("~", "~0").replace("/", "~1");
    }

    private static String unescapeJsonPointer(String value) {
        return value.replace("~1", "/").replace("~0", "~");
    }

    private static String stripSuffix(String value, String suffix) {
        if (suffix != null && !suffix.isEmpty() && value.endsWith(suffix)) {
            return value.substring(0, value.length() - suffix.length());
        }
        return value;
    }
}
